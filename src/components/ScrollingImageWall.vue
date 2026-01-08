<!-- src/components/ScrollingImageWall.vue -->
<template>
  <div
    ref="rootEl"
    class="siw"
    :style="rootStyle"
    role="presentation"
    aria-hidden="true"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <div v-if="!hasImages" class="siw__empty" />

    <div v-else class="siw__viewport">
      <div class="siw__track" :style="trackInlineStyle">
        <!-- Strip A -->
        <div class="siw__strip" :style="stripStyle">
          <component
            v-for="(item, i) in stripTiles"
            :key="`a-${i}`"
            :is="item.href ? 'a' : 'div'"
            class="siw__tile"
            :style="tileStyle"
            :href="item.href || undefined"
            :target="item.href ? linkTarget : undefined"
            :rel="item.href ? linkRel : undefined"
            @click="onTileClick($event, item)"
          >
            <img class="siw__img" :src="item.src" alt="" draggable="false" />
          </component>
        </div>

        <!-- Strip B (duplicate for seamless loop) -->
        <div class="siw__strip" :style="stripStyle" aria-hidden="true">
          <component
            v-for="(item, i) in stripTiles"
            :key="`b-${i}`"
            :is="item.href ? 'a' : 'div'"
            class="siw__tile"
            :style="tileStyle"
            :href="item.href || undefined"
            :target="item.href ? linkTarget : undefined"
            :rel="item.href ? linkRel : undefined"
            tabindex="-1"
          >
            <img class="siw__img" :src="item.src" alt="" draggable="false" />
          </component>
        </div>
      </div>

      <div v-if="edgeFade" class="siw__fade" aria-hidden="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Direction = 'left' | 'right'

type ImageItem =
  | string
  | {
      src: string
      href?: string
    }

const props = withDefaults(
  defineProps<{
    /**
     * images can be:
     *  - string[] (src)
     *  - { src, href? }[] (src + optional link)
     */
    images: ImageItem[]

    tileWidth?: number
    tileHeight?: number
    gap?: number

    /**
     * How many images should be visible in ONE strip.
     * - 0 (default) = auto-calc based on container width
     * - N > 0 = force exactly N tiles (plus buffer for seamless looping)
     */
    visibleCount?: number

    speedPxPerSec?: number
    direction?: Direction

    /**
     * When an item has href, anchor target/rel will use these.
     */
    linkTarget?: '_blank' | '_self'
    linkRel?: string

    edgeFade?: boolean
    /**
     * Enable click-drag scrub (mouse or touch).
     */
    draggable?: boolean
  }>(),
  {
    tileWidth: 96,
    tileHeight: 96,
    gap: 14,
    visibleCount: 0,
    speedPxPerSec: 26,
    direction: 'left',
    linkTarget: '_blank',
    linkRel: 'noopener noreferrer',
    edgeFade: false,
    draggable: true,
  }
)

const rootEl = ref<HTMLElement | null>(null)
const containerW = ref(0)

const hasImages = computed(() => Array.isArray(props.images) && props.images.length > 0)

const normalized = computed(() => {
  const out: Array<{ src: string; href?: string }> = []
  for (const it of props.images || []) {
    if (typeof it === 'string') out.push({ src: it })
    else if (it && typeof it.src === 'string') out.push({ src: it.src, href: it.href })
  }
  return out
})

/**
 * - Ensure we are measuring the correct element (rootEl is now bound in template).
 * - visibleCount lets you override auto-measure entirely if you want.
 */
let ro: ResizeObserver | null = null
function measure() {
  const el = rootEl.value
  if (!el) return
  containerW.value = Math.round(el.getBoundingClientRect().width)
}

onMounted(() => {
  measure()
  if (rootEl.value && 'ResizeObserver' in window) {
    ro = new ResizeObserver(() => measure())
    ro.observe(rootEl.value)
  } else {
    window.addEventListener('resize', measure, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (ro && rootEl.value) ro.unobserve(rootEl.value)
  ro = null
  window.removeEventListener('resize', measure)
  stop()
})

/** tiles per strip */
const tilesNeeded = computed(() => {
  const step = props.tileWidth + props.gap
  const auto = Math.max(1, Math.ceil(Math.max(1, containerW.value) / Math.max(1, step)) + 2)
  const forced = props.visibleCount && props.visibleCount > 0 ? props.visibleCount : 0
  // If forced, add a small buffer so the seam never flashes
  return forced > 0 ? Math.max(1, forced + 2) : auto
})

const stripWidthPx = computed(() => {
  const count = tilesNeeded.value
  if (count <= 1) return props.tileWidth
  return count * props.tileWidth + (count - 1) * props.gap
})

const stripTiles = computed(() => {
  if (!hasImages.value) return []
  const srcs = normalized.value
  const n = srcs.length
  const count = tilesNeeded.value
  const out: Array<{ src: string; href?: string }> = []
  for (let i = 0; i < count; i++) out.push(srcs[i % n])
  return out
})

/* ---------------------------
   Animation (no CSS keyframes)
   - rAF loop updates a single translate3d
   - Drag overrides offset while pointer is down
   --------------------------- */

const offsetPx = ref(0) // translation in px
let rafId: number | null = null
let lastTs = 0

const dirSign = computed(() => (props.direction === 'right' ? 1 : -1))

function tick(ts: number) {
  if (!lastTs) lastTs = ts
  const dt = (ts - lastTs) / 1000
  lastTs = ts

  if (!dragState.isDown) {
    const speed = Math.max(0, props.speedPxPerSec)
    offsetPx.value += dirSign.value * speed * dt
    offsetPx.value = wrapOffset(offsetPx.value)
  }

  rafId = window.requestAnimationFrame(tick)
}

function start() {
  if (rafId != null) return
  lastTs = 0
  rafId = window.requestAnimationFrame(tick)
}

function stop() {
  if (rafId == null) return
  window.cancelAnimationFrame(rafId)
  rafId = null
  lastTs = 0
}

function wrapOffset(v: number) {
  const w = stripWidthPx.value
  if (!w || w <= 0) return v
  // Keep offset in [-w, 0) for stable precision
  let x = v % w
  if (x > 0) x -= w
  return x
}

onMounted(() => {
  start()
})

/* Drag scrub */
const dragState = {
  isDown: false,
  pointerId: -1,
  startX: 0,
  startOffset: 0,
}

function onPointerDown(e: PointerEvent) {
  if (!props.draggable) return
  if (!hasImages.value) return
  // Only left mouse, or any touch/pen
  if (e.pointerType === 'mouse' && e.button !== 0) return

  dragState.isDown = true
  dragState.pointerId = e.pointerId
  dragState.startX = e.clientX
  dragState.startOffset = offsetPx.value

  // Capture so we keep receiving move events
  ;(e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!props.draggable) return
  if (!dragState.isDown) return
  if (e.pointerId !== dragState.pointerId) return

  const dx = e.clientX - dragState.startX
  offsetPx.value = wrapOffset(dragState.startOffset + dx)
}

function onPointerUp(e: PointerEvent) {
  if (!props.draggable) return
  if (!dragState.isDown) return
  if (e.pointerId !== dragState.pointerId) return

  dragState.isDown = false
  dragState.pointerId = -1
}

/**
 * Avoid “click-through” when user is dragging:
 * If they drag more than a small threshold, prevent the click navigation.
 */
function onTileClick(evt: MouseEvent, item: { src: string; href?: string }) {
  if (!item.href) return
  if (!props.draggable) return
  // If the user dragged, block click
  const moved = Math.abs(offsetPx.value - dragState.startOffset)
  if (dragState.isDown || moved > 6) {
    evt.preventDefault()
    evt.stopPropagation()
  }
}

/* Styles */
const rootStyle = computed(() => ({
  '--siw-gap': `${props.gap}px`,
  '--siw-tile-w': `${props.tileWidth}px`,
  '--siw-tile-h': `${props.tileHeight}px`,
}))

const tileStyle = computed(() => ({
  width: `${props.tileWidth}px`,
  height: `${props.tileHeight}px`,
}))

const stripStyle = computed(() => ({
  gap: `${props.gap}px`,
}))

const trackInlineStyle = computed(() => ({
  transform: `translate3d(${offsetPx.value}px, 0, 0)`,
}))
</script>

<style scoped>
/* ==========================================================================
   Scrolling Image Wall (Single Row + draggable scrub)
   - No tile rounding, no borders, no backgrounds on tiles.
   - Gap 0 => seamless edge-to-edge images.
   - Uses rAF transform updates + pointer drag (no heavy DOM).
   ========================================================================== */

.siw {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;

  /* Important: the wall itself should not impose borders/background */
  background: transparent;
  touch-action: pan-y; /* allow vertical page scroll, but we handle horizontal scrub */
  cursor: grab;
}

.siw:active {
  cursor: grabbing;
}

.siw__viewport {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Empty state */
.siw__empty {
  width: 100%;
  height: 100%;
}

/* Track contains two strips to enable seamless wrap */
.siw__track {
  height: 100%;
  display: flex;
  align-items: center;
  gap: var(--siw-gap);
  will-change: transform;
  transform: translate3d(0, 0, 0);
}

/* One strip = single row */
.siw__strip {
  display: flex;
  align-items: center;
  gap: var(--siw-gap);

  /* No padding so gap=0 becomes truly seamless */
  padding: 0;
  box-sizing: border-box;
}

/* Tile wrapper:
   - no border, no rounding, no background
   - keep it block-level for <a> and <div> parity */
.siw__tile {
  flex: 0 0 auto;
  display: block;
  width: var(--siw-tile-w);
  height: var(--siw-tile-h);
  overflow: hidden;
  border: none;
  border-radius: 0;
  background: transparent;
  text-decoration: none;
}

/* Stretch images to exact tile size */
.siw__img {
  width: 100%;
  height: 100%;
  object-fit: fill; /* stretch */
  display: block;
  user-select: none;
  pointer-events: none;
}

/* Optional edge fade (off by default) */
.siw__fade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.22),
    transparent 12%,
    transparent 88%,
    rgba(0, 0, 0, 0.22)
  );
}

/* Reduced motion: stop auto scroll (drag still works) */
@media (prefers-reduced-motion: reduce) {
  .siw {
    cursor: default;
  }
}
</style>
