<!-- src/components/dashboard/AnnouncementBanner.vue -->
<template>
  <section class="banner" role="region" aria-label="Announcements">
    <div class="tray" :class="{ minimized }" @mouseenter="pause()" @mouseleave="resume()" @focusin="pause()"
      @focusout="resume()">
      <!-- Minimize / Restore -->
      <button class="minimize-btn" type="button" :aria-pressed="minimized ? 'true' : 'false'"
        :aria-label="minimized ? 'Expand announcements' : 'Minimize announcements'" @click="toggleMinimize">
        <span v-if="!minimized" aria-hidden="true">−</span>
        <span v-else aria-hidden="true">⌄</span>
      </button>

      <!-- Mini bar label when minimized -->
      <div v-if="minimized" class="mini-label">Announcements</div>

      <!-- Full content when not minimized -->
      <div v-else class="content">
        <h3 class="title">{{ current.title }}</h3>
        <p v-if="current.body" class="body">{{ current.body }}</p>

        <div class="cta">
          <a v-if="current.ctaHref && current.ctaLabel" class="btn" :href="current.ctaHref" target="_blank"
            rel="noopener">
            <span>{{ current.ctaLabel }}</span>
          </a>
        </div>

        <!-- Optional note line -->
        <p v-if="current.note" class="below-note" :style="{ fontSize: noteFontSize(current) }">
          {{ current.note }}
        </p>
      </div>

      <!-- Dots (only when multiple and not minimized) -->
      <div class="dots" role="tablist" aria-label="Announcement slides" v-if="!minimized && itemsResolved.length > 1">
        <button v-for="(it, i) in itemsResolved" :key="it.id" class="dot" :class="{ active: i === idx }" role="tab"
          :aria-selected="i === idx ? 'true' : 'false'" @click="go(i)" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'

type Announcement = {
  id: string
  title: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  image?: string
  note?: string
  noteSize?: 'sm' | 'md' | 'lg' | number
}


const props = withDefaults(defineProps<{
  items?: Announcement[]
  autoRotate?: boolean
  rotateMs?: number | string
  /** render minimized on first mount */
  startMinimized?: boolean
}>(), {
  autoRotate: true,
  rotateMs: 8000,
  startMinimized: false,
})

/** Default announcement if no items are provided */
const defaultItems: Announcement[] = [
  {
    id: 'a1',
    title: 'Welcome to EiTake!',
    body: 'Make a free account to track your progress!',
    ctaLabel: 'Go',
    ctaHref: '/dashboard',
    image: '',
  },
  {
    id: 'a2',
    title: 'EiTake へようこそ！',
    body: '無料アカウントを作成して、進捗を記録しましょう！',
    ctaLabel: '移動',
    ctaHref: '/dashboard',
    image: '',
  },
]

const itemsResolved = computed<Announcement[]>(() =>
  props.items && props.items.length ? props.items : defaultItems
)

const idx = ref(0)
const rotateMsNum = computed(() => Number(props.rotateMs ?? 8000))
const current = computed(() => itemsResolved.value[idx.value] ?? itemsResolved.value[0])

let t: number | null = null
const paused = ref(false)

function clearTimer() { if (t) { clearTimeout(t); t = null } }
function go(i: number) { idx.value = i }

function schedule() {
  if (!props.autoRotate || itemsResolved.value.length <= 1 || paused.value) return
  clearTimer()
  t = window.setTimeout(() => {
    if (!paused.value) {
      idx.value = (idx.value + 1) % itemsResolved.value.length
    }
    schedule()
  }, rotateMsNum.value)
}

function pause() {
  paused.value = true
  clearTimer()
}
function resume() {
  paused.value = false
  schedule()
}

function noteFontSize(it: Announcement): string {
  const s = it.noteSize
  if (typeof s === 'number' && Number.isFinite(s)) return `${s}px`
  if (s === 'sm') return 'clamp(14px, 1.6vw, 16px)'
  if (s === 'lg') return 'clamp(18px, 2.6vw, 24px)'
  return 'clamp(16px, 2vw, 20px)'
}



/* Minimize state */
const minimized = ref(false)
function toggleMinimize() { minimized.value = !minimized.value }

onMounted(() => {
  minimized.value = !!props.startMinimized
  schedule()
})
onBeforeUnmount(clearTimer)
watch(() => [itemsResolved.value, props.autoRotate, rotateMsNum.value], schedule)
</script>

<style scoped>
/* Wrapper centers the tray and constrains width */
.banner {
  inline-size: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  max-width: 60vw;
}

/* Main card — plain white surface + theme border */
.tray {
  position: relative;
  inline-size: min(80%, 1100px);

  /* OPEN SIZE (upper bound) */
  max-height: 260px;

  /* SURFACE & INK */
  background: #ffffff;
  color: var(--text-main, #0f172a);

  /* FRAME */
  border: 4px solid var(--header-accent);
  border-radius: 18px;
  box-shadow: var(--shadow-main, 0 8px 20px rgba(0, 0, 0, .12));

  outline: none;

  display: grid;
  place-items: center;
  text-align: center;
  padding: clamp(16px, 3vw, 28px);
  overflow: hidden;

  transition:
    max-height .22s ease,
    padding .2s ease,
    inline-size .2s ease,
    border-radius .2s ease;
}

/* Minimize button (top-right, icon-only) */
.minimize-btn {
  position: absolute;
  top: clamp(8px, 1.5vw, 12px);
  right: clamp(8px, 1.5vw, 12px);
  line-height: 0;
  padding: 0.15rem 0.4rem;
  border-radius: 10px;

  /* match card: white bg + secondary border */
  background: transparent;
  border: 2px solid transparent;
  color: var(--text-main, #0f172a);

  cursor: pointer;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, .06));
  font-size: clamp(18px, 2.2vw, 22px);
  opacity: 0.55;
  transition: transform .12s ease, opacity .15s ease, background-color .15s ease, border-color .15s ease;
}

.minimize-btn:hover {
  transform: scale(1.06) rotate(-6deg);
  opacity: 1;
  background: transparent;
}

.minimize-btn:active {
  transform: scale(0.98);
}

/* Minimized bar styles */
.tray.minimized {
  /* COLLAPSED SIZE */
  max-height: 52px;
  padding: 8px 14px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}


.mini-label {
  font-weight: 900;
  letter-spacing: 0.2px;
  color: var(--text-main, #0f172a);
}

/* Text block */
.content {
  max-inline-size: 920px;
  margin: 0 auto;
  color: var(--text-main, #0f172a);

  opacity: 0;
  transform: translateY(-6px);
  animation: banner-open 180ms ease-out forwards;
}

@keyframes banner-open {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Title & body */
.title {
  margin: 0 0 6px 0;
  font-size: clamp(16px, 2.4vw, 24px);
  font-weight: 900;
  letter-spacing: 0.2px;
  color: var(--text-main, #0f172a);
}

.body {
  margin: 0 0 12px 0;
  font-size: clamp(13px, 1.8vw, 18px);
  color: var(--text-main-muted, #475569);
}

/* CTA button — border = --accent-secondary; fill animation = --accent-primary */
.btn {
  position: relative;
  display: inline-block;
  padding: 10px 16px;
  border-radius: 12px;
  border: 2px solid var(--header-on-surface);
  background: #ffffff;
  color: var(--text-main, #0f172a);
  font-weight: 800;
  text-decoration: none;
  overflow: hidden;
  transform: translateZ(0);
  box-shadow: 0 3px 10px rgba(0, 0, 0, .08);
  transition:
    transform .18s cubic-bezier(.2, .9, .2, 1),
    border-color .2s ease,
    background-color .2s ease;
}

/* keep label above the fill layer */
.btn>span {
  position: relative;
  z-index: 1;
}

/* fill layer behind text — solid --accent-primary */
.btn::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--accent-primary);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform .26s ease;
  z-index: 0;
}

.btn:hover::before {
  transform: scaleX(1);
}

/* on hover keep text readable and border consistent */
.btn:hover {
  color: var(--text-on-primary, #0f172a);
  border-color: var(--header-on-surface);
  transform: scale(1.04) rotate(-1.5deg);
}

.btn:active {
  transform: scale(0.98);
}

/* Optional line under the CTA (tokenized) */
.below-note {
  margin: 12px 0 0;
  font-weight: 900;
  line-height: 1.2;
  color: var(--main-text, #0f172a);
  text-wrap: balance;
}



/* Dots controller */
.dots {
  position: absolute;
  inset-inline-end: 12px;
  inset-block-end: 12px;
  display: flex;
  gap: 6px;
}

.dot {
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
  border: 1px solid var(--text-main, #0f172a);
  background: color-mix(in srgb, var(--text-main, #0f172a) 12%, transparent);
  cursor: pointer;
  transition: background-color .15s ease, transform .08s ease;
}

.dot:hover {
  transform: scale(1.1);
}

.dot.active {
  background: var(--text-main, #0f172a);
}

/* Mobile tweaks */
@media (max-width: 640px) {
  .tray {
    inline-size: min(92%, 540px);
    padding: 14px;
    border-width: 2px;
  }

  .tray.minimized {
    padding: 8px 12px;
  }

  .dots {
    inset-inline-end: 8px;
    inset-block-end: 8px;
  }

  .btn {
    padding: 9px 14px;
    border-radius: 10px;
  }
}
</style>
