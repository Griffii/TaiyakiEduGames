<!-- src/components/FeaturedGames.vue -->
<template>
  <section class="featured" role="region" aria-label="Featured Games">
    <div class="card-wrap">
      <!-- OUTSIDE ARROWS (desktop/tablet) -->
      <button
        class="nav outer nav-left"
        type="button"
        :disabled="!items?.length || items.length < 2"
        @click="prev"
        aria-label="Previous game"
      >‹</button>

      <button
        class="nav outer nav-right"
        type="button"
        :disabled="!items?.length || items.length < 2"
        @click="next"
        aria-label="Next game"
      >›</button>

      <!-- CLIPPED CARD CONTENT -->
      <div
        class="card"
        @mouseenter="interacting = true"
        @mouseleave="onCardLeave"
        @focusin="interacting = true"
        @focusout="interacting = false"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointerleave="onPointerCancel"
        @pointercancel="onPointerCancel"
      >
        <div class="card-inner">
          <!-- Animated stage (ONLY this animates) -->
          <div class="stage" :key="index" :class="slideClass">
            <!-- HERO -->
            <div class="left">
              <div class="hero">
                <div class="media">
                  <img
                    v-if="displayMedia.type === 'image'"
                    :src="displayMedia.src"
                    :alt="current.title"
                  />
                  <video
                    v-else
                    :poster="displayMedia.poster"
                    preload="metadata"
                    muted
                    loop
                    playsinline
                    autoplay
                  >
                    <source :src="displayMedia.src" :type="mimeFor(displayMedia.src)" />
                  </video>
                </div>

                <div class="hero-title">
                  <h3>{{ current.title }}</h3>
                </div>
              </div>
            </div>

            <!-- SIDE -->
            <aside class="side">
              <div class="thumbs" role="list">
                <button
                  v-for="(g, i) in thumbs"
                  :key="i"
                  class="thumb"
                  :class="{ active: selectedMediaIndex === i }"
                  role="listitem"
                  type="button"
                  @click="selectThumb(i)"
                  :aria-label="'Show media ' + (i + 1)"
                >
                  <div class="media">
                    <img v-if="g.type === 'image'" :src="g.src" :alt="current.title + ' media ' + (i+1)" />
                    <video v-else :poster="g.poster" preload="metadata" muted loop playsinline>
                      <source :src="g.src" :type="mimeFor(g.src)" />
                    </video>
                  </div>
                </button>
              </div>

              <!-- Open row; on mobile, inline arrows flank Open -->
              <div class="open-row" v-if="isInteractive">
                <button
                  class="nav-inline nav-inline-left"
                  type="button"
                  :disabled="!items?.length || items.length < 2"
                  @click="prev"
                  aria-label="Previous game"
                >‹</button>

                <button class="btn-open" type="button" @click="open">Open</button>

                <button
                  class="nav-inline nav-inline-right"
                  type="button"
                  :disabled="!items?.length || items.length < 2"
                  @click="next"
                  aria-label="Next game"
                >›</button>
              </div>

              <div class="tags" aria-label="Tags">
                <span
                  class="tag"
                  v-for="t in current.tags"
                  :key="t"
                  :style="tagStyle(t)"
                >{{ t }}</span>
              </div>
            </aside>
          </div>

          <!-- Dots (static; do not animate with stage) -->
          <div
            class="card-dots"
            :role="isInteractive ? 'tablist' : undefined"
            :aria-label="isInteractive ? 'Featured items' : undefined"
          >
            <template v-if="isInteractive">
              <button
                v-for="(it, i) in items"
                :key="it.id"
                class="dot"
                :class="{ active: i === index }"
                @click="go(i)"
                :aria-label="'Show ' + it.title"
                role="tab"
                :aria-selected="i === index"
              />
            </template>
            <template v-else>
              <span
                v-for="(it, i) in items"
                :key="it.id"
                class="dot indicator"
                :class="{ active: i === index }"
                aria-hidden="true"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type MediaItem = { type: 'image' | 'video'; src: string; poster?: string }
type FeaturedItem = {
  id: string
  title: string
  hero: MediaItem
  gallery: MediaItem[]   
  tags: string[]
  link: string
}

const props = withDefaults(defineProps<{
  items: FeaturedItem[]
  cycleMs?: number
  interactive?: boolean
}>(), {
  interactive: true,
})

const emit = defineEmits<{ (e: 'open', link: string): void }>()

const index = ref(0)
const selectedMediaIndex = ref(0)
const interacting = ref(false)
const isInteractive = computed(() => props.interactive !== false)

const ms = computed(() => props.cycleMs ?? 8000)
const current = computed<FeaturedItem>(() => props.items[index.value] ?? props.items[0])

/* Exactly 4 media: first is default hero; all 4 show on right */
const mediaList = computed<MediaItem[]>(() => {
  const g = current.value?.gallery ?? []
  return [current.value.hero, ...g.slice(0, 3)]
})
const thumbs = computed<MediaItem[]>(() => mediaList.value)
const displayMedia = computed<MediaItem>(() => mediaList.value[selectedMediaIndex.value] ?? mediaList.value[0])

function selectThumb(i: number) { selectedMediaIndex.value = i }

/* Tag chip colors */
const TAG_COLORS = ['#f4e5a6', '#bfe6ff', '#f6c2d2', '#bdecc6', '#ffd3b6', '#d8c6ff'] as const
function tagStyle(tag: string) {
  let sum = 0
  for (let i = 0; i < tag.length; i++) sum = (sum + tag.charCodeAt(i)) % 997
  const bg = TAG_COLORS[sum % TAG_COLORS.length]
  return { backgroundColor: bg, color: '#0f1a15', borderColor: 'transparent' }
}

/* Video MIME */
function mimeFor(u: string) {
  const ext = u.split('.').pop()?.toLowerCase()
  return ext === 'webm' ? 'video/webm' : 'video/mp4'
}

/* Auto-cycle pause on hover/focus */
let timer: number | null = null
function start() {
  stop()
  if (!props.items?.length) return
  timer = window.setInterval(() => {
    if (interacting.value) return
    navigate('right')
  }, ms.value)
}
function stop() { if (timer) { clearInterval(timer); timer = null } }
function restart() { start() }
onMounted(start)
onBeforeUnmount(stop)
watch(() => [props.items, ms.value], start)

/* Slide animation direction */
const slideDir = ref<'left' | 'right' | null>(null)
const slideClass = computed(() => slideDir.value ? `slide-in-from-${slideDir.value}` : '')

function navigate(direction: 'left' | 'right') {
  slideDir.value = direction
  index.value = (index.value + (direction === 'right' ? 1 : -1) + props.items.length) % props.items.length
  selectedMediaIndex.value = 0
}
function prev() { navigate('left'); restart() }
function next() { navigate('right'); restart() }
function go(i: number) {
  if (!isInteractive.value) return
  slideDir.value = i > index.value ? 'right' : 'left'
  index.value = i
  selectedMediaIndex.value = 0
  restart()
}
function open() { if (isInteractive.value) emit('open', current.value.link) }
function onCardLeave() { interacting.value = false }

/* Swipe (touch + mouse) */
const dragStartX = ref<number | null>(null)
const dragging = ref(false)
function onPointerDown(e: PointerEvent) { dragStartX.value = e.clientX; dragging.value = true }
function onPointerMove(_: PointerEvent) { /* optional live drag preview */ }
function onPointerUp(e: PointerEvent) {
  if (!dragging.value || dragStartX.value === null) { dragging.value = false; return }
  const dx = e.clientX - dragStartX.value
  const threshold = 60
  if (dx <= -threshold) next()
  else if (dx >= threshold) prev()
  dragging.value = false
  dragStartX.value = null
}
function onPointerCancel() { dragging.value = false; dragStartX.value = null }
</script>

<style scoped>
/* Section */
.featured {
  inline-size: 100%;
  padding-inline: clamp(8px, 2vw, 16px);
  margin-top: 40px;
}

/* Container that caps width and anchors outside arrows */
.card-wrap {
  position: relative;
  max-inline-size: min(80vw, 1280px);
  margin-inline: auto;
}

/* Card: all content clipped inside — modal tokens */
.card {
  position: relative;
  inline-size: 100%;
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  padding: clamp(10px, 1.8vw, 16px);
  overflow: hidden;
  box-shadow: var(--modal-shadow);
}

/* Inner layout: stage (animates) + static dots */
.card-inner {
  display: grid;
  grid-template-rows: auto auto; /* stage, then dots */
  gap: 14px;
}

/* Stage: ONLY this animates; children are clipped */
.stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr minmax(260px, 420px);
  gap: 14px;
  border-radius: calc(var(--modal-radius) - 2px);
  overflow: hidden;
  background: transparent;
  will-change: transform, opacity;
  backface-visibility: hidden;
  padding: 10px;
}

/* Slide-in animations */
@keyframes slideFromRight {
  from { opacity: 0.001; transform: translateX(50px); }
  to   { opacity: 1;     transform: translateX(0); }
}
@keyframes slideFromLeft {
  from { opacity: 0.001; transform: translateX(-50px); }
  to   { opacity: 1;     transform: translateX(0); }
}
.slide-in-from-right { animation: slideFromRight 480ms cubic-bezier(.22,.61,.36,1) both; }
.slide-in-from-left  { animation: slideFromLeft  480ms cubic-bezier(.22,.61,.36,1) both; }

/* OUTSIDE ARROWS (desktop/tablet) — modal tokens */
.nav.outer {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  inline-size: 44px;
  block-size: 44px;
  border-radius: 9999px;
  border: 1px solid var(--modal-border);
  background: var(--modal-surface); /* subtle fill inside modal context */
  color: var(--modal-on-surface);
  display: grid;
  place-items: center;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,.18);
  z-index: 2;
  transition: background .18s ease, border-color .18s ease, transform .18s ease, opacity .15s ease, color .18s ease;
}
.nav.outer.nav-left  { right: calc(100% + 12px); left: auto; }
.nav.outer.nav-right { left:  calc(100% + 12px); right: auto; }
.nav.outer:hover {
  background: var(--modal-accent);
  color: #fff;
  transform: translateY(-50%) scale(1.1);
  border-color: color-mix(in srgb, var(--modal-accent) 60%, var(--modal-border) 40%);
}
.nav.outer:active   { transform: translateY(calc(-50% + 2px)) scale(1.06); }
.nav.outer:disabled { opacity: 0.5; cursor: not-allowed; }

/* Left (hero) + right (side) columns inside stage */
.left { display: grid; align-content: start; gap: 10px; }
.side {
  display: grid;
  grid-template-rows: auto 1fr auto 1fr auto; /* thumbs | spacer | open | spacer | tags */
  gap: 14px;
  min-block-size: 100%;
}

/* Hero media */
.hero {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000; /* video/image canvas */
  aspect-ratio: 16 / 9;
  border: 1px solid var(--modal-border);
  box-shadow: 0 6px 16px rgba(0,0,0,.12);
}
.media, .media img, .media video {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
  display: block;
}

/* Title chip inside hero */
.hero-title {
  position: absolute;
  inset-inline: 12px;
  inset-block-end: 12px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, #ffffff 70%, transparent);
  color: var(--modal-on-surface);
  backdrop-filter: blur(4px);
  border: 1px solid var(--modal-border);
  box-shadow: 0 6px 14px rgba(0,0,0,.18);
}
.hero-title h3 {
  margin: 0;
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 800;
  text-shadow: 0 1px 6px rgba(0,0,0,.18);
}

/* Thumbs 2x2 */
.thumbs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.thumb {
  border: 0;
  padding: 0;
  background: var(--neutral-100); /* no modal-weak token; neutral fallback */
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 16 / 9;
  border: 1px solid var(--modal-border);
  position: relative;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, outline-color .12s ease;
}
.thumb:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0,0,0,.12);
  border-color: color-mix(in srgb, var(--modal-accent) 45%, var(--modal-border) 55%);
}
.thumb.active {
  outline: 3px solid color-mix(in srgb, var(--modal-accent) 65%, #fff 35%);
  outline-offset: 2px;
}

/* Open row */
.open-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

/* Inline arrows for mobile row */
.nav-inline {
  inline-size: 40px;
  block-size: 40px;
  border-radius: 9999px;
  border: 1px solid var(--modal-border);
  background: var(--neutral-100); /* neutral fallback */
  color: var(--modal-on-surface);
  display: none; /* shown in mobile media query */
  place-items: center;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(0,0,0,.15);
  transition: background .18s ease, transform .18s ease, color .18s ease, border-color .18s ease;
}
.nav-inline:hover {
  background: var(--modal-accent);
  color: #fff; /* see warning re: on-accent */
  transform: scale(1.06);
  border-color: color-mix(in srgb, var(--modal-accent) 60%, var(--modal-border) 40%);
}

/* Open button — uses modal accents */
.btn-open {
  --_accent: var(--modal-accent);
  --_accent-light: color-mix(in srgb, var(--modal-accent) 18%, var(--modal-surface) 82%);
  padding: 12px 18px;
  border-radius: var(--radius-sm);
  border: 2px solid color-mix(in srgb, var(--modal-accent) 45%, var(--modal-border) 55%);
  background-color: var(--_accent-light);
  color: var(--modal-on-surface);

  background-image: linear-gradient(0deg, var(--_accent), var(--_accent));
  background-size: 0% 100%;
  background-repeat: no-repeat;
  background-position: left;

  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(0,0,0,.14);
  transition:
    background-size .18s ease,
    background-color .18s ease,
    color .15s ease,
    border-color .15s ease,
    transform .10s ease,
    filter .15s ease;
}
.btn-open:hover {
  background-size: 100% 100%;
  border-color: color-mix(in srgb, var(--modal-accent) 70%, var(--modal-border) 30%);
  color: #fff; /* fallback without --modal-on-accent */
  filter: brightness(0.98);
  transform: translateY(-1px);
}
.btn-open:active { transform: translateY(0); }

@media (max-width: 900px) {
  .btn-open { padding: 10px 14px; }
}

/* Tags — token defaults (note: inline style from script will override) */
.tags {
  grid-row: 5;
  place-self: end end;
  display: flex;
  flex-wrap: wrap-reverse;
  justify-content: flex-end;
  align-content: flex-end;
  gap: 6px;
  max-inline-size: 100%;
  overflow: hidden;
}
.tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 9999px;
  border: 1px solid var(--modal-border);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  max-block-size: calc(1em + 6px);
  font-weight: 700;
  color: var(--modal-on-surface);
  background: color-mix(in srgb, var(--modal-accent-2) 14%, var(--modal-surface) 86%);
}

/* Dots (static) */
.card-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
}
.dot {
  inline-size: 10px;
  block-size: 10px;
  border-radius: 50%;
  border: 1px solid var(--modal-border);
  background: var(--neutral-100); /* subtle neutral fill */
  cursor: pointer;
  transition: background-color .15s ease, transform .1s ease, border-color .15s ease;
}
.dot:hover { transform: scale(1.05); border-color: color-mix(in srgb, var(--modal-accent) 45%, var(--modal-border) 55%); }
.dot.active { background: var(--modal-on-surface); }

/* Non-interactive indicators */
.card-dots .indicator { cursor: default; pointer-events: none; }

/* Responsive: stack + inline arrows around Open on small screens */
@media (max-width: 900px) {
  .stage { grid-template-columns: 1fr; } /* stack hero over side */
  .nav.outer { display: none; }
  .nav-inline { display: grid; }
  .side { grid-template-rows: auto auto auto; } /* thumbs → open row → tags */
  .btn-open { padding: 10px 14px; border-radius: var(--radius-sm); }
}
</style>


