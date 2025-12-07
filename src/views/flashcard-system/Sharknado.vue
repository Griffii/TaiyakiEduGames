<!-- src/views/Sharknado.vue -->
<template>
  <section class="sharknado-page">
    <!-- Back Button -->
    <button class="home-button" type="button" @click="onExit" aria-label="Back">
      <img :src="homeIcon" alt="" />
    </button>

    <!-- Settings Button -->
    <button
      class="settings-button"
      type="button"
      @click="toggleSettingsMenu"
      aria-haspopup="dialog"
      :aria-expanded="showSettings"
      aria-controls="settings-menu"
    >
      <img :src="settingsIcon" alt="" />
    </button>

    <!-- Backdrop to close settings on outside click -->
    <div v-show="showSettings" class="settings-backdrop" @click="closeSettingsMenu" />

    <!-- Settings Menu -->
    <div
      id="settings-menu"
      class="settings-menu"
      v-show="showSettings"
      role="dialog"
      :aria-modal="false"
      :aria-hidden="!showSettings"
      @click.stop
    >
      <h3>Game Settings</h3>

      <label for="display-card-limit">Number of Cards:</label>
      <input id="display-card-limit" type="number" min="1" v-model.number="displayLimitDraft" />

      <!-- Live English toggle: updates UI immediately, button color reflects state -->
      <button
        id="toggle-english-btn"
        class="toggle-english-btn"
        :class="showEnglish ? 'on' : 'off'"
        @click="toggleEnglish"
      >
        English: {{ showEnglish ? 'ON' : 'OFF' }}
      </button>

      <label class="checkbox">
        <input type="checkbox" v-model="includeSharkDraft" />
        Sharks
      </label>
      <label class="checkbox">
        <input type="checkbox" v-model="includeTornadoDraft" />
        Tornadoes
      </label>
      <label class="checkbox">
        <input type="checkbox" v-model="doublePointsDraft" />
        Double Points
      </label>

      <button class="apply-btn" @click="applySettings">Apply</button>
      <button class="restart-btn" @click="restart">New Round</button>
      <button class="cancel-btn" @click="closeSettingsMenu">Cancel</button>
    </div>

    <h1 class="title">Sharknado</h1>

    <!-- Card Grid -->
    <div class="card-grid" role="list">
      <div
        v-for="(card, idx) in visibleCards"
        :key="`${card.id}-${idx}`"
        class="card"
        :class="{ revealed: card.isFlipped }"
        role="listitem"
        @click="onFlip(idx)"
      >
        <div class="card-inner">
          <!-- FRONT -->
          <div class="card-front">
            <img class="card-img" :src="card.image_url" :alt="cardAlt(card)" />
            <div class="card-text" v-if="showEnglish">{{ card.english }}</div>
          </div>

          <!-- BACK -->
          <div
            class="card-back"
            :class="{
              shark: card.effect === 'shark',
              tornado: card.effect === 'tornado'
            }"
          >
            <div v-if="card.effect === 'points'" class="card-result points" aria-live="polite">
              +{{ card.value }}
            </div>
            <div v-else-if="card.effect === 'shark'" class="card-result icon" aria-live="polite">🦈</div>
            <div v-else-if="card.effect === 'tornado'" class="card-result icon" aria-live="polite">🌪️</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== FULLSCREEN FX OVERLAY ===== -->
    <div v-if="overlay.active" class="fx-overlay" aria-hidden="false">
      <!-- Shark track -->
      <div v-if="overlay.type === 'shark'" class="fx-track shark-track" @animationend="onOverlayEnd('shark')">
        <img :src="sharkOpen" class="fx-shark open" alt="" />
        <img :src="sharkClosed" class="fx-shark closed" alt="" />
      </div>
      <!-- Tornado track -->
      <div v-else-if="overlay.type === 'tornado'" class="fx-track tornado-track" @animationend="onOverlayEnd('tornado')">
        <img :src="tornadoImg" class="fx-tornado-sprite" alt="" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameTransitStore, type Flashcard as TransitCard } from '@/stores/gameTransit'

type Effect = 'points' | 'shark' | 'tornado'
interface GameCard extends TransitCard {
  isFlipped: boolean
  effect: Effect
  value: number
}

const STORAGE_PREFIX = 'sharknado.'
const K = {
  display: STORAGE_PREFIX + 'displayCount',
  english: STORAGE_PREFIX + 'showEnglish',
  shark: STORAGE_PREFIX + 'includeShark',
  tornado: STORAGE_PREFIX + 'includeTornado',
  double: STORAGE_PREFIX + 'doublePoints',
  pool: STORAGE_PREFIX + 'lastPool',
}

const props = withDefaults(
  defineProps<{
    cards?: TransitCard[]
    displayCount?: number
    showEnglishDefault?: boolean
    includeSharkDefault?: boolean
    includeTornadoDefault?: boolean
    doublePointsDefault?: boolean
  }>(),
  {
    displayCount: 21,
    showEnglishDefault: false,
    includeSharkDefault: true,
    includeTornadoDefault: true,
    doublePointsDefault: false,
  }
)

const router = useRouter()
const transit = useGameTransitStore()

const allCards = ref<TransitCard[]>([])
const visibleCards = ref<GameCard[]>([])
const showSettings = ref(false)

const displayLimit = ref<number>(loadNum(K.display, props.displayCount))
const showEnglish = ref<boolean>(loadBool(K.english, props.showEnglishDefault))
const includeShark = ref<boolean>(loadBool(K.shark, props.includeSharkDefault))
const includeTornado = ref<boolean>(loadBool(K.tornado, props.includeTornadoDefault))
const doublePoints = ref<boolean>(loadBool(K.double, props.doublePointsDefault))

const displayLimitDraft = ref(displayLimit.value)
/* keep a draft for other settings, but English is now live-bound to showEnglish */
const showEnglishDraft = ref(showEnglish.value)
const includeSharkDraft = ref(includeShark.value)
const includeTornadoDraft = ref(includeTornado.value)
const doublePointsDraft = ref(doublePoints.value)

/* Icons */
const homeIcon = new URL('@/assets/images/icons/back-icon.png', import.meta.url).toString()
const settingsIcon = new URL('@/assets/images/icons/settings-icon.png', import.meta.url).toString()

/* Special PNGs (overlay sprites) */
const sharkOpen = new URL('@/assets/images/games/sharknado/shark-open.png', import.meta.url).toString()
const sharkClosed = new URL('@/assets/images/games/sharknado/shark-closed.png', import.meta.url).toString()
const tornadoImg = new URL('@/assets/images/games/sharknado/tornado.png', import.meta.url).toString()

/* SFX */
const flipSfx = new Audio(new URL('@/assets/sounds/arcade_beep_01.mp3', import.meta.url).toString())
const sharkSfx = new Audio(new URL('@/assets/sounds/bite.mp3', import.meta.url).toString())
const tornadoSfx = new Audio(new URL('@/assets/sounds/spinning_sfx.mp3', import.meta.url).toString())
flipSfx.preload = 'auto'
sharkSfx.preload = 'auto'
tornadoSfx.preload = 'auto'

/* Failsafe timer for shark SFX */
let sharkStopTimer: number | null = null
function stopSharkSfx() {
  sharkSfx.loop = false
  sharkSfx.pause()
  sharkSfx.currentTime = 0
  if (sharkStopTimer != null) {
    clearTimeout(sharkStopTimer)
    sharkStopTimer = null
  }
}

const sourceCards = computed<TransitCard[]>(() => (props.cards?.length ? props.cards : transit.cards))

/* Fullscreen overlay state */
const overlay = ref<{ active: boolean; type: null | 'shark' | 'tornado' }>({ active: false, type: null })
function showOverlay(type: 'shark' | 'tornado') {
  // lock flips during overlay
  overlay.value = { active: true, type }

  if (type === 'shark') {
    // ensure previous playback is fully stopped before starting
    stopSharkSfx()
    sharkSfx.loop = true
    sharkSfx.currentTime = 0
    sharkSfx.play().catch(() => {})
    // hard stop failsafe slightly longer than animation (3200ms)
    sharkStopTimer = window.setTimeout(stopSharkSfx, 3600)
  } else {
    tornadoSfx.loop = false
    tornadoSfx.currentTime = 0
    tornadoSfx.play().catch(() => {})
  }
}
function onOverlayEnd(type: 'shark' | 'tornado') {
  if (type === 'shark') stopSharkSfx()
  overlay.value = { active: false, type: null }
}

/* --- Preload sprites so overlays appear instantly --- */
const preloaded = new Set<string>()
function preloadImage(url: string) {
  if (!url || preloaded.has(url)) return
  const img = new Image()
  img.decoding = 'async'
  img.loading = 'eager'
  img.src = url
  preloaded.add(url)
}

/* Lifecycle */
onMounted(() => {
  // persist initial english setting if not present
  if (localStorage.getItem(K.english) == null) saveBool(K.english, showEnglish.value)

  // Preload overlay sprites (shark + tornado)
  ;[sharkOpen, sharkClosed, tornadoImg].forEach(preloadImage)

  // Start the round
  startRound()

  window.addEventListener('click', handleOutsideSettingsClick, true)
})
onUnmounted(() => {
  window.removeEventListener('click', handleOutsideSettingsClick, true)
  stopSharkSfx()
})

watch(() => sourceCards.value, () => startRound(), { deep: true })

/* Game flow */
function startRound() {
  const pool = (sourceCards.value?.length ? sourceCards.value : loadPool()) ?? []
  allCards.value = pool

  const limit = Math.max(1, Number(displayLimit.value || 1))
  const picked = pickVisible(pool, limit)

  const base: GameCard[] = picked.map((c) => ({
    ...c,
    isFlipped: false,
    effect: 'points',
    value: randomPoints(doublePoints.value),
  }))

  const specials = Math.floor(limit / 5)
  let effectIndex = 0
  for (let i = 0; i < specials && effectIndex < base.length; i++) {
    let fx: Effect | null = null
    if (includeShark.value && includeTornado.value) fx = i % 2 === 0 ? 'shark' : 'tornado'
    else if (includeShark.value) fx = 'shark'
    else if (includeTornado.value) fx = 'tornado'
    if (fx) {
      base[effectIndex].effect = fx
      base[effectIndex].value = 0
      effectIndex++
    }
  }

  visibleCards.value = shuffle(base)
  persistSettings()
  if (pool.length) savePool(pool)
}

function onFlip(idx: number) {
  // prevent flipping while overlay is animating to avoid SFX issues / double triggers
  if (overlay.value.active) return

  const card = visibleCards.value[idx]
  if (!card || card.isFlipped) return

  flipSfx.currentTime = 0
  flipSfx.play().catch(() => {})
  card.isFlipped = true

  if (card.effect === 'shark') showOverlay('shark')
  else if (card.effect === 'tornado') showOverlay('tornado')
}

/* Helpers */
function pickVisible<T>(pool: T[], limit: number): T[] {
  if (!pool || !pool.length) return []
  const bag = [...pool]
  const chosen: T[] = []
  while (chosen.length < limit && bag.length) {
    chosen.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0])
  }
  return chosen
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function randomPoints(doubleIt: boolean): number {
  const base = 10 * (Math.floor(Math.random() * 10) + 1) // 10..100
  return doubleIt ? base * 2 : base
}
function cardAlt(c: TransitCard) {
  return c.english ? `Card: ${c.english}` : 'Card'
}

/* Settings UI */
function toggleSettingsMenu() {
  displayLimitDraft.value = displayLimit.value
  showEnglishDraft.value = showEnglish.value
  includeSharkDraft.value = includeShark.value
  includeTornadoDraft.value = includeTornado.value
  doublePointsDraft.value = doublePoints.value
  showSettings.value = !showSettings.value
}
function closeSettingsMenu() { showSettings.value = false }
function handleOutsideSettingsClick(e: MouseEvent) {
  if (!showSettings.value) return
  const menu = document.getElementById('settings-menu')
  const btns = document.getElementsByClassName('settings-button')
  const target = e.target as Node
  const clickInMenu = menu?.contains(target)
  const clickOnBtn = [...btns].some((b) => b.contains(target))
  if (!clickInMenu && !clickOnBtn) showSettings.value = false
}
function toggleEnglish() {
  // flip both live and draft states, persist immediately (no Apply needed)
  showEnglish.value = !showEnglish.value
  showEnglishDraft.value = showEnglish.value
  saveBool(K.english, showEnglish.value)
}
function applySettings() {
  displayLimit.value = Math.max(1, Number(displayLimitDraft.value || 1))
  includeShark.value = !!includeSharkDraft.value
  includeTornado.value = !!includeTornadoDraft.value
  doublePoints.value = !!doublePointsDraft.value
  persistSettings()
  closeSettingsMenu()
  startRound()
}
function restart() { startRound() }
function persistSettings() {
  saveNum(K.display, displayLimit.value)
  saveBool(K.english, showEnglish.value)
  saveBool(K.shark, includeShark.value)
  saveBool(K.tornado, includeTornado.value)
  saveBool(K.double, doublePoints.value)
}

/* Storage helpers */
function loadBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key)
  return raw == null ? fallback : raw === 'true'
}
function saveBool(key: string, val: boolean) { localStorage.setItem(key, String(val)) }
function loadNum(key: string, fallback: number): number {
  const raw = localStorage.getItem(key)
  if (raw == null) return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}
function saveNum(key: string, val: number) { localStorage.setItem(key, String(val)) }

type MinimalCard = Pick<TransitCard, 'id' | 'english' | 'image_url'>
function savePool(pool: TransitCard[]) {
  try {
    const slim: MinimalCard[] = pool.map(c => ({ id: c.id, english: c.english, image_url: c.image_url }))
    sessionStorage.setItem(K.pool, JSON.stringify(slim))
  } catch { }
}
function loadPool(): TransitCard[] | null {
  try {
    const raw = sessionStorage.getItem(K.pool)
    if (!raw) return null
    const slim = JSON.parse(raw) as MinimalCard[]
    return slim || null
  } catch { return null }
}

/* Nav */
function onExit() { try { router.back() } catch { } }
</script>

<style scoped>
/* --- Page base (no explicit background; use global app bg) --- */
.sharknado-page {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
  text-align: center;
  min-height: 100vh;
  padding: 60px 100px 60px;
}

.title {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.42);
}

/* --- Home / Settings buttons --- */
.home-button,
.settings-button {
  position: fixed;
  top: 20px;
  width: 38px;
  height: 38px;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.home-button { left: 20px; }
.settings-button { right: 20px; }

.home-button img,
.settings-button img {
  width: 100%;
  height: auto;
  transition: transform 0.2s ease-in-out;
}
.home-button img:hover { transform: scale(1.08); }
.settings-button:hover img { transform: scale(1.06) rotate(6deg); }

/* --- Settings backdrop (theme modal tokens) --- */
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  -webkit-backdrop-filter: var(--modal-overlay-filter);
  z-index: 999;
}

/* --- Settings menu (theme modal tokens) --- */
.settings-menu {
  position: fixed;
  top: 72px;
  right: 20px;
  width: 260px;
  text-align: center;
  align-items: center;

  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);

  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 1100;
}

.settings-menu h3 {
  margin: 2px 0 6px;
  font-weight: 800;
  font-size: 18px;
  color: var(--modal-on-surface);
}

/* Labels + inputs */
.settings-menu label {
  font-weight: 700;
  color: var(--modal-on-surface);
}

.settings-menu .checkbox {
  width: 100%;
  text-align: left;
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  color: var(--modal-on-surface);
}

.settings-menu input[type="number"] {
  width: 110px;
  padding: 8px 10px;
  margin-top: 4px;
  border-radius: var(--radius-sm);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  box-shadow: var(--elevation-1);
  outline: none;
}
.settings-menu input[type="number"]:focus-visible {
  box-shadow: var(--focus-ring);
}

/* Base style for all menu buttons */
.settings-menu button {
  display: block;
  width: 100%;
  padding: 10px 14px;
  font-weight: 800;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transform: translateZ(0);
  transition: transform .12s ease, filter .15s ease, box-shadow .15s ease;
  box-shadow: var(--elevation-1);
}

/* Apply (accent-primary) */
.apply-btn {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-primary) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-primary) 70%, #000 30%) 85%
    );
  color: var(--btn-primary-on);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 65%, #000 35%);
}

/* Restart (accent-secondary) */
.restart-btn {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-secondary) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-secondary) 70%, #000 30%) 85%
    );
  color: var(--btn-secondary-on);
  border: 1px solid color-mix(in srgb, var(--accent-secondary) 65%, #000 35%);
}

/* Cancel (accent-danger) */
.cancel-btn {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-danger) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-danger) 70%, #000 30%) 85%
    );
  color: var(--btn-danger-on);
  border: 1px solid color-mix(in srgb, var(--accent-danger) 65%, #000 35%);
}

/* English toggle — ON uses yellow accent gradient with NO extra border; OFF uses danger-ghost with NO border */
#toggle-english-btn.toggle-english-btn {
  border: none;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-warning) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-warning) 70%, #000 30%) 85%
    );
  color: var(--modal-on-surface);
}
#toggle-english-btn.toggle-english-btn.off {
  border: none;
  background: color-mix(in srgb, var(--accent-danger) 16%, var(--neutral-0) 84%);
  color: var(--btn-danger-on);
}

/* Hover/active/focus parity */
.settings-menu button:hover,
#toggle-english-btn:hover { transform: scale(1.03); }
.settings-menu button:active,
#toggle-english-btn:active { transform: scale(0.99); }
.settings-menu button:focus-visible,
#toggle-english-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* --- Grid (default) --- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 20px;
  margin: 20px;
  justify-items: center;
}

/* --- Cards --- */
.card {
  width: 120px;
  height: 160px;
  perspective: 1000px;
  position: relative;
  cursor: pointer;
  background-color: transparent;
}
.card:hover { transform: scale(1.03); }

.card-inner {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  position: relative;
  transition: transform 540ms cubic-bezier(.2, .6, .2, 1);
  border-radius: 10px;
  box-sizing: border-box;
}
.card.revealed .card-inner { transform: rotateY(180deg); }

/* FRONT/BACK: center image + English together; resize gracefully if one is missing */
.card-front,
.card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;     /* vertical centering */
  gap: 8px;                    /* space between image and text */
  border: 2px solid #0f766e;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(2, 6, 23, .08);
  overflow: hidden;
  padding: 8px;
}

/* FRONT image sizing */
.card-front .card-img {
  max-width: 100%;
  max-height: 72%;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
  padding: 2px;
}
/* If there is NO English text, let the image grow taller */
.card-front:not(:has(.card-text)) .card-img { max-height: 92%; }

/* English text */
.card-text {
  text-align: center;
  font-weight: 800;
  font-size: 14px;
  color: #0b1f1d;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .4);
  line-height: 1.12;
  pointer-events: none;
  word-break: break-word;
}

/* BACK fill */
.card-back { transform: rotateY(180deg); background-color: #fffdf3; }

.card-result.points {
  font-size: 28px;
  font-weight: 900;
  color: #b45309;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .8);
}
.card-result.icon { font-size: 40px; line-height: 1; }

/* ===== FULLSCREEN FX (transparent overlay) ===== */
.fx-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
}

.fx-track {
  position: absolute;
  top: 50vh;
  left: 0;
  transform: translate(-60vw, -50%);
  will-change: transform;
}

/* SHARK */
.shark-track { animation: swimAcrossLinear 3200ms linear 0s 1 both; }
.fx-shark {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: min(70vw, 900px);
  max-width: 900px;
  height: auto;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, .45));
  animation: mouthToggle 1000ms steps(1, end) 0s infinite;
  will-change: opacity;
}
.fx-shark.closed { animation-direction: reverse; }

/* TORNADO */
.tornado-track { animation: traverseAcrossLinear 1500ms linear 0s 1 both; }
.fx-tornado-sprite {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: min(40vw, 520px);
  height: auto;
  filter: drop-shadow(0 14px 30px rgba(0, 0, 0, .5));
  animation: undulateY 1600ms ease-in-out 0s 1 both;
  will-change: transform;
}

/* Keyframes */
@keyframes mouthToggle {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes swimAcrossLinear {
  0%   { transform: translate(-60vw, -50%); }
  100% { transform: translate(110vw, -50%); }
}
@keyframes traverseAcrossLinear {
  0%   { transform: translate(-60vw, -50%); }
  100% { transform: translate(110vw, -50%); }
}
@keyframes undulateY {
  0%   { transform: translateY(-50%); }
  25%  { transform: translateY(calc(-50% - 60px)); }
  50%  { transform: translateY(-50%); }
  75%  { transform: translateY(calc(-50% + 60px)); }
  100% { transform: translateY(-50%); }
}

/* ---------- Responsive: minimum of 3 columns on small screens ---------- */
@media (max-width: 400px) {
  .card-grid {
    gap: 8px;
    margin: 12px;
    grid-template-columns: repeat(3, minmax(72px, 1fr));
    justify-items: stretch;
  }
  .card {
    width: 100%;
    min-width: 72px;
    aspect-ratio: 5 / 8;
    height: auto;
  }
}
@media (min-width: 401px) and (max-width: 520px) {
  .card-grid {
    gap: 10px;
    margin: 14px;
    grid-template-columns: repeat(3, minmax(78px, 1fr));
    justify-items: stretch;
  }
  .card {
    width: 100%;
    min-width: 78px;
    aspect-ratio: 5 / 8;
    height: auto;
  }
}
@media (min-width: 521px) and (max-width: 768px) {
  .card-grid {
    gap: 12px;
    margin: 16px;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  }
  .card {
    width: 100%;
    min-width: 92px;
    aspect-ratio: 5 / 7;
    height: auto;
  }
}
@media (min-width: 769px) and (max-width: 1023px) {
  .card-grid {
    gap: 14px;
    margin: 18px;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }
  .card {
    width: 100%;
    min-width: 110px;
    aspect-ratio: 5 / 7;
    height: auto;
  }
}
@media (min-width: 1024px) {
  .card { width: 140px; height: 180px; }
  .card-grid {
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
@media (min-width: 1440px) {
  .card { width: 160px; height: 200px; }
  .card-grid {
    gap: 28px;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
@media (min-width: 1920px) {
  .card { width: 200px; height: 260px; }
  .card-grid {
    gap: 32px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>



