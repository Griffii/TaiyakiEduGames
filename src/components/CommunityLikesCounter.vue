<!-- src/components/CommunityAppreciationPanel.vue -->
<template>
  <section class="cap-root" :style="rootStyle" @pointerdown="onPointerDown">
    <div class="cap-stack">
      <!-- Header -->
      <header class="cap-head">
        <p class="cap-subtitle">Tap the heart to show some love!</p>
        <div class="cap-micro">
          If EiTake has every been of help, click the heart to let us know!
        </div>
        <div v-if="error" class="cap-error">{{ error }}</div>
      </header>

      <!-- Heart (image) -->
      <button
        ref="heartBtnEl"
        class="cap-heart-btn"
        type="button"
        :disabled="isBusy || !hasLoaded"
        :class="[isBusy ? 'is-busy' : '', lastAnimClass]"
        @click="onHeartClick"
        @animationstart="onHeartAnimStart"
        @animationend="onHeartAnimEnd"
        aria-label="Send a community like"
        title="Send a like"
      >
        <img class="cap-heart-img" :src="props.heartSrc" alt="" draggable="false" />
      </button>

      <!-- Counters (bottom) -->
      <footer class="cap-foot" aria-label="Community likes counters">
        <div class="cap-counters">
          <div class="cap-counter">
            <div class="cap-counter-label">Total Likes</div>
            <div class="cap-counter-value">{{ fmt(counts.total) }}</div>
          </div>

          <div class="cap-counter">
            <div class="cap-counter-label">Today</div>
            <div class="cap-counter-value">{{ fmt(counts.daily_total) }}</div>
          </div>

          <div class="cap-counter">
            <div class="cap-counter-label">This Week</div>
            <div class="cap-counter-value">{{ fmt(counts.weekly_total) }}</div>
          </div>

          <div class="cap-counter">
            <div class="cap-counter-label">This Month</div>
            <div class="cap-counter-value">{{ fmt(counts.monthly_total) }}</div>
          </div>
        </div>
      </footer>
    </div>

    <!-- Burst layer -->
    <div class="cap-burst-layer" aria-hidden="true">
      <span
        v-for="b in bursts"
        :key="b.id"
        class="cap-burst-heart"
        :style="{
          left: b.x + 'px',
          top: b.y + 'px',
          '--dx': b.dx + 'px',
          '--dy': b.dy + 'px',
          '--rot': b.rot + 'deg',
          '--durUp': b.durUp + 'ms',
          '--durFall': b.durFall + 'ms',
          '--delay': b.delay + 'ms',
          '--size': b.size + 'px',
          '--alpha': b.alpha
        }"
      >
        ❤
      </span>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'

import heartPng from '@/assets/images/icons/heart.png'
import sfxHeartClick from '@/assets/sounds/win_chime.mp3'

const props = defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '100%' },
  rowId: { type: String, default: 'EiTake' },
  incrementRpc: { type: String, default: 'increment_community_likes' },
  incrementAmount: { type: Number, default: 1 },

  // Allow swapping the heart image when needed
  heartSrc: { type: String, default: heartPng },

  // Optional fallback for testing only (not concurrency-safe):
  useDirectUpdate: { type: Boolean, default: false },
})

const rootStyle = computed(() => ({
  width: props.width,
  height: props.height,
}))

const counts = ref({
  total: 0,
  daily_total: 0,
  weekly_total: 0,
  monthly_total: 0,
})

const hasLoaded = ref(false)
const isBusy = ref(false)
const error = ref('')

// Random animation selection for the heart image/button
const lastAnimClass = ref('')
const animClasses = ['anim-bounce', 'anim-spin', 'anim-wiggle', 'anim-pop', 'anim-squash', 'anim-float']

// Animation lock: do not override an animation once started
const isHeartAnimating = ref(false)

// Burst particles
const bursts = ref([])
let burstId = 1
let cleanupTimers = []
let lastPointer = { x: null, y: null }
const heartBtnEl = ref(null)

/** =========================
 *  Heart click SFX (low latency + 3-voice overlap)
 *  ========================= */
const SFX_VOICES = 3
const sfxPool = ref([]) // Array<HTMLAudioElement>
let sfxUnlocked = false
let sfxCursor = 0

function primeHeartSfx() {
  try {
    const pool = []
    for (let i = 0; i < SFX_VOICES; i++) {
      const a = new Audio(sfxHeartClick)
      a.preload = 'auto'
      a.volume = 1
      pool.push(a)
    }
    sfxPool.value = pool
  } catch {
    // ignore (e.g., SSR / restricted environments)
  }
}

// IMPORTANT: call this during a user gesture (pointerdown) to eliminate first-play delay
function unlockHeartSfx() {
  if (sfxUnlocked || !sfxPool.value.length) return

  const pool = sfxPool.value
  let unlockedCount = 0

  for (const a of pool) {
    try {
      const prevVol = a.volume

      // Play silently once to unlock + decode
      a.volume = 0
      a.currentTime = 0

      const p = a.play()
      if (p && typeof p.then === 'function') {
        p.then(() => {
          a.pause()
          a.currentTime = 0
          a.volume = prevVol

          unlockedCount++
          if (unlockedCount >= pool.length) sfxUnlocked = true
        }).catch(() => {
          // ignore
        })
      }
    } catch {
      // ignore
    }
  }
}

function playHeartSfx() {
  const pool = sfxPool.value
  if (!pool.length) return

  const a = pool[sfxCursor]
  sfxCursor = (sfxCursor + 1) % pool.length

  try {
    a.currentTime = 0
    void a.play()
  } catch {
    // ignore autoplay/gesture edge-cases
  }
}

function fmt(n) {
  const v = Number(n ?? 0)
  return v.toLocaleString()
}

async function loadOnce() {
  error.value = ''

  const { data, error: e } = await supabase
    .from('community_likes')
    .select('total,daily_total,weekly_total,monthly_total')
    .eq('id', props.rowId)
    .single()

  if (e) {
    error.value = `Failed to load community likes. (${e.message})`
    return
  }

  counts.value = {
    total: Number(data?.total ?? 0),
    daily_total: Number(data?.daily_total ?? 0),
    weekly_total: Number(data?.weekly_total ?? 0),
    monthly_total: Number(data?.monthly_total ?? 0),
  }

  hasLoaded.value = true
}

function applyLocalIncrement(amount) {
  counts.value.total = Number(counts.value.total ?? 0) + amount
  counts.value.daily_total = Number(counts.value.daily_total ?? 0) + amount
  counts.value.weekly_total = Number(counts.value.weekly_total ?? 0) + amount
  counts.value.monthly_total = Number(counts.value.monthly_total ?? 0) + amount
}

async function incrementLikeServerSide() {
  if (!props.useDirectUpdate) {
    const { error: rpcErr } = await supabase.rpc(props.incrementRpc, {
      p_id: props.rowId,
      p_amount: props.incrementAmount,
    })
    if (rpcErr) throw rpcErr
    return
  }

  // Fallback (testing only): update total only (uses already incremented local number).
  const { error: updErr } = await supabase
    .from('community_likes')
    .update({ total: Number(counts.value.total ?? 0) })
    .eq('id', props.rowId)

  if (updErr) throw updErr
}

function pickAnimClass() {
  return animClasses[Math.floor(Math.random() * animClasses.length)]
}

/**
 * Start an animation only if none is currently running.
 * Do not allow click spam to override an in-flight animation.
 */
function startHeartAnimIfIdle(el) {
  if (!el || isHeartAnimating.value) return

  // Lock immediately so rapid clicks cannot "beat" animationstart
  isHeartAnimating.value = true

  // Force a clean start for this run
  lastAnimClass.value = ''
  void el.offsetWidth

  lastAnimClass.value = pickAnimClass()
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function onPointerDown(e) {
  // Unlock audio ASAP on first user interaction to eliminate playback delay
  unlockHeartSfx()

  if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
    lastPointer = { x: e.clientX, y: e.clientY }
  }
}

/**
 * Ensures hover returns after the animation completes:
 * - remove the anim class so the button is back to its normal CSS (hover/active work again)
 * - release the animation lock
 */
function onHeartAnimStart() {
  // No-op: we lock earlier in startHeartAnimIfIdle for spam safety.
  // Kept for clarity / future hooks.
}

function onHeartAnimEnd() {
  isHeartAnimating.value = false
  lastAnimClass.value = '' // important: return to baseline so hover state is always available
}

function getBurstPointFromClick(ev) {
  if (ev && typeof ev.clientX === 'number' && typeof ev.clientY === 'number') {
    return { x: ev.clientX, y: ev.clientY }
  }

  const el = heartBtnEl.value
  if (el) {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  if (lastPointer.x != null) return { x: lastPointer.x, y: lastPointer.y }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

function spawnBurstAt(x, y) {
  // Slower / floatier burst
  const count = 10 + Math.floor(Math.random() * 5)
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + Math.random() * Math.PI
    const power = 35 + Math.random() * 65

    const dx = Math.cos(angle) * power + (Math.random() * 26 - 13)
    const dy = Math.sin(angle) * power - (45 + Math.random() * 70)

    const durUp = 900 + Math.floor(Math.random() * 650)
    const durFall = 2200 + Math.floor(Math.random() * 1500) // slower
    const delay = Math.floor(Math.random() * 140)
    const size = 10 + Math.floor(Math.random() * 14)
    const rot = Math.floor(Math.random() * 220 - 110)
    const alpha = (0.45 + Math.random() * 0.35).toFixed(2)

    const id = `${now}-${burstId++}-${i}`

    bursts.value.push({ id, x, y, dx, dy, rot, durUp, durFall, delay, size, alpha })

    const t = window.setTimeout(() => {
      const idx = bursts.value.findIndex((b) => b.id === id)
      if (idx !== -1) bursts.value.splice(idx, 1)
    }, durUp + durFall + delay + 160)

    cleanupTimers.push(t)
  }
}

async function onHeartClick(ev) {
  if (isBusy.value || !hasLoaded.value) return

  isBusy.value = true
  error.value = ''

  // SFX and bursts can repeat freely, even during an animation
  playHeartSfx()

  const p = getBurstPointFromClick(ev)
  spawnBurstAt(clamp(p.x, 0, window.innerWidth), clamp(p.y, 0, window.innerHeight))

  // Only start a new heart animation if we're currently idle
  await nextTick()
  startHeartAnimIfIdle(heartBtnEl.value)

  applyLocalIncrement(props.incrementAmount)

  try {
    await incrementLikeServerSide()
  } catch (e) {
    applyLocalIncrement(-props.incrementAmount)
    error.value = `Could not send like. (${e?.message || 'Unknown error'})`
  } finally {
    isBusy.value = false
  }
}

onMounted(async () => {
  primeHeartSfx()
  await loadOnce()
})

onBeforeUnmount(() => {
  for (const t of cleanupTimers) window.clearTimeout(t)
  cleanupTimers = []

  for (const a of sfxPool.value) {
    try {
      a.pause()
      a.src = ''
    } catch {
      // ignore
    }
  }
  sfxPool.value = []
})
</script>

<style scoped>
/* ============================================================================
   COMMUNITY APPRECIATION PANEL — TOKEN-DRIVEN
   Uses EiTake theme tokens (eitake.css) so it stays readable across themes.
   ============================================================================ */

.cap-root {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  /* Component-scoped "semantic" vars (fallbacks included) */
  --cap-surface: var(--modal-surface, var(--table-surface, #fff));
  --cap-on: var(--modal-on-surface, var(--table-on-surface, #18261f));
  --cap-soft: var(--modal-on-surface-soft, var(--table-muted, #6f847c));
  --cap-border: var(--modal-border, rgba(0, 0, 0, 0.14));
  --cap-radius: var(--radius-lg, 18px);
  --cap-shadow: var(--elevation-1, 0 3px 10px rgba(0, 0, 0, 0.12));

  /* Accent hooks */
  --cap-accent: var(--accent-primary, #2aa9ff);
  --cap-accent-2: var(--accent-secondary, #00e0b8);
  --cap-danger: var(--accent-danger, #ff2f53);

  /* Surface + subtle theme-tinted bloom (no hard-coded dark mode assumptions) */
  background:
    radial-gradient(
      900px 420px at 50% 10%,
      color-mix(in srgb, var(--cap-accent) 18%, transparent),
      transparent 62%
    ),
    radial-gradient(
      720px 380px at 20% 45%,
      color-mix(in srgb, var(--cap-accent-2) 16%, transparent),
      transparent 60%
    ),
    radial-gradient(
      720px 380px at 80% 45%,
      color-mix(in srgb, var(--cap-danger) 14%, transparent),
      transparent 60%
    ),
    var(--cap-surface);

  color: var(--cap-on);
}

/* Compact layout: header / heart / counters always visible */
.cap-stack {
  height: 100%;
  width: 100%;
  padding: 14px 14px 10px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  align-items: center;
  justify-items: center;
  min-height: 260px;
}

.cap-head {
  text-align: center;
  max-width: 760px;
}

.cap-subtitle {
  margin: 0;
  font-size: clamp(1.02rem, 1.5vw, 1.2rem);
  font-weight: 900;
  letter-spacing: 0.2px;
  color: var(--cap-on);
  text-shadow: 0 1px 0 color-mix(in srgb, #000 18%, transparent);
}

.cap-micro {
  margin-top: 6px;
  font-size: 0.86rem;
  line-height: 1.25;
  color: var(--cap-soft);
}

.cap-error {
  margin-top: 6px;
  font-size: 0.88rem;
  color: color-mix(in srgb, var(--cap-danger) 80%, var(--cap-on) 20%);
}

/* Heart button: only the image */
.cap-heart-btn {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  user-select: none;
  display: grid;
  place-items: center;
  transition: transform 120ms ease, filter 120ms ease, opacity 120ms ease;
}

.cap-heart-btn:hover {
  transform: translateY(-1px) scale(1.02);
  filter: brightness(1.03);
}

.cap-heart-btn:active {
  transform: translateY(0px) scale(0.985);
}

.cap-heart-btn:disabled {
  cursor: default;
  opacity: 0.6;
  filter: grayscale(0.25);
}

.cap-heart-btn.is-busy {
  opacity: 0.75;
}

.cap-heart-img {
  width: clamp(78px, 20vw, 120px);
  height: auto;
  display: block;

  /* Shadow that works on light/dark because it’s blended */
  filter: drop-shadow(0 14px 22px color-mix(in srgb, #000 28%, transparent));
  pointer-events: none;
}

/* Bottom counters */
.cap-foot {
  width: 100%;
  display: grid;
  place-items: center;
}


/* Keep side-by-side even on narrow screens: shrink cards instead of stacking */
.cap-counters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;                 
  width: min(700px, 100%);
}

.cap-counter {
  padding: 8px 7px;       
  border-radius: var(--radius-md, 14px);

  background: color-mix(in srgb, var(--cap-surface) 78%, var(--cap-accent) 22%);
  border: 1px solid color-mix(in srgb, var(--cap-border) 55%, transparent);
  box-shadow: var(--cap-shadow);
  backdrop-filter: blur(8px);

  min-width: 0; 
}

.cap-counter-label {
  font-size: clamp(0.64rem, 2.1vw, 0.74rem); 
  margin-bottom: 3px;                       
  color: var(--cap-soft);
  white-space: nowrap;
}

.cap-counter-value {
  font-size: clamp(0.92rem, 3.0vw, 1.06rem);
  font-weight: 900;
  letter-spacing: 0.2px;
  color: var(--cap-on);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


/* Burst layer (full-screen fixed so particles can fall off-view) */
.cap-burst-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 9999;
}

.cap-burst-heart {
  position: absolute;
  font-size: var(--size);
  opacity: var(--alpha);
  transform: translate(-50%, -50%);

  /* Use theme accents rather than forced white */
  color: color-mix(in srgb, var(--cap-danger) 72%, var(--cap-accent) 28%);
  text-shadow: 0 10px 26px color-mix(in srgb, #000 26%, transparent);

  animation:
    burstUp var(--durUp) cubic-bezier(0.16, 1, 0.3, 1) var(--delay) forwards,
    burstFall var(--durFall) cubic-bezier(0.18, 0.7, 0.18, 1)
      calc(var(--delay) + var(--durUp) * 0.35)
      forwards;
}

@keyframes burstUp {
  0% {
    transform: translate(-50%, -50%) scale(0.7) rotate(0deg);
  }

  70% {
    transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.02) rotate(var(--rot));
  }

  100% {
    transform: translate(calc(-50% + (var(--dx) * 0.75)), calc(-50% + (var(--dy) * 0.75))) scale(1)
      rotate(calc(var(--rot) * 1.05));
  }
}

@keyframes burstFall {
  0% {
    opacity: var(--alpha);
  }

  100% {
    transform: translate(calc(-50% + (var(--dx) * 0.75)), calc(-50% + (var(--dy) * 0.75) + 820px))
      rotate(calc(var(--rot) * 1.25));
    opacity: 0;
  }
}

/* Random click animations applied to the heart button (image animates with it) */
.anim-bounce {
  animation: heartBounce 520ms cubic-bezier(0.2, 1.2, 0.2, 1) both;
}

@keyframes heartBounce {
  0% {
    transform: scale(1);
  }

  25% {
    transform: scale(1.14) translateY(-6px);
  }

  55% {
    transform: scale(0.96) translateY(2px);
  }

  100% {
    transform: scale(1);
  }
}

.anim-spin {
  animation: heartSpin 720ms cubic-bezier(0.2, 1, 0.2, 1) both;
}

@keyframes heartSpin {
  0% {
    transform: scale(1) rotate(0deg);
  }

  45% {
    transform: scale(1.08) rotate(180deg);
  }

  100% {
    transform: scale(1) rotate(360deg);
  }
}

.anim-wiggle {
  animation: heartWiggle 620ms ease-in-out both;
}

@keyframes heartWiggle {
  0% {
    transform: rotate(0deg) scale(1);
  }

  15% {
    transform: rotate(-9deg) scale(1.05);
  }

  30% {
    transform: rotate(11deg) scale(1.06);
  }

  45% {
    transform: rotate(-11deg) scale(1.06);
  }

  60% {
    transform: rotate(9deg) scale(1.04);
  }

  100% {
    transform: rotate(0deg) scale(1);
  }
}

.anim-pop {
  animation: heartPop 520ms cubic-bezier(0.2, 1.4, 0.2, 1) both;
}

@keyframes heartPop {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }

  35% {
    transform: scale(1.2);
    filter: brightness(1.08);
  }

  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

.anim-squash {
  animation: heartSquash 560ms cubic-bezier(0.2, 1, 0.2, 1) both;
}

@keyframes heartSquash {
  0% {
    transform: scale(1);
  }

  25% {
    transform: scale(1.18, 0.84);
  }

  55% {
    transform: scale(0.94, 1.12);
  }

  100% {
    transform: scale(1);
  }
}

.anim-float {
  animation: heartFloat 860ms cubic-bezier(0.2, 1, 0.2, 1) both;
}

@keyframes heartFloat {
  0% {
    transform: translateY(0) scale(1);
  }

  35% {
    transform: translateY(-10px) scale(1.08);
  }

  100% {
    transform: translateY(0) scale(1);
  }
}
</style>
