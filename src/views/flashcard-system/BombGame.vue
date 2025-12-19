/** A user asked to replace the Mushroom image with a Taiyaki image, like the original
So now all text references say "Taiyaki" but all code refrences a mushroom.
Sorry abou that. I can't be bothered to change all 30 references to mushroom back to taiyaki.
**/

<template>
  <section class="bomb-game-page">
    <!-- Back Button -->
    <button class="home-button" type="button" @click="onExit" aria-label="Back">
      <img :src="homeIcon" alt="" />
    </button>

    <!-- Settings Button -->
    <button class="settings-button" type="button" @click="toggleSettingsMenu" aria-haspopup="dialog"
      :aria-expanded="showSettings" aria-controls="settings-menu">
      <img :src="settingsIcon" alt="" />
    </button>

    <h1 id="game-title">{{ mode === 'bomb' ? 'Bomb Game' : 'Find the Taiyaki!' }}</h1>

    <p v-if="!allCards.length" class="muted">No cards loaded. Go back and select some cards.</p>

    <!-- Card Grid: FACE-UP initially; click flips to RESULT -->
    <div v-else id="card-grid" class="card-grid" :class="{ ended }">
      <div v-for="(card, idx) in visibleCards" :key="card.id" class="card"
        :class="{ revealed: card.isFlipped, hit: ended && card.isTarget }" @click="onCardClick(card, idx)" role="button"
        :aria-pressed="card.isFlipped">
        <div class="card-inner" :class="{
          'bomb-anim': hitIndex === idx && mode === 'bomb',
          'mushroom-anim': hitIndex === idx && mode === 'mushroom'
        }">
          <!-- FRONT (face up initially) -->
          <div class="card-front">
            <div class="card-media">
              <img class="card-img" :src="card.image_url" :alt="cardAlt(card)" decoding="async" />
            </div>
            <div class="card-text" v-if="showEnglish"
              v-fittext="{ minRatio: 0.08, maxRatio: 0.17, minPx: 14, maxPx: 32 }">
              {{ card.english }}
            </div>
          </div>

          <!-- BACK (after click) -->
          <div class="card-back" :class="{
            blank: card.backKind === 'blank',
            'glow-yellow': hitIndex === idx && mode === 'mushroom'
          }">
            <img v-if="card.backKind !== 'blank'" class="result-img" :src="resultImg(card)" :alt="resultAlt(card)"
              decoding="async" />
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop to close settings on outside click -->
    <div v-show="showSettings" class="settings-backdrop" @click="closeSettingsMenu" />

    <!-- Settings panel -->
    <!-- Settings Button + Drop-down -->
    <div class="settings-wrap" ref="settingsWrap">
      <button class="settings-button" type="button" @click="toggleSettingsMenu" aria-haspopup="dialog"
        :aria-expanded="showSettings" aria-controls="settings-menu">
        <img :src="settingsIcon" alt="" />
      </button>

      <!-- Full-screen blurred backdrop (covers game area, not menu) -->
      <div v-if="showSettings" class="settings-backdrop" @click="closeSettingsMenu" aria-hidden="true"></div>

      <!-- Drop-down with open/close animation -->
      <Transition name="settings-drop">
        <div v-if="showSettings" id="settings-menu" class="settings-dropdown" role="dialog" :aria-modal="false"
          :data-mode="modeDraft" :aria-hidden="!showSettings">
          <h3 class="settings-title">Game Settings</h3>

          <div class="settings-row">
            <label class="settings-label" for="display-card-limit">Number of Cards</label>
            <input class="settings-input" type="number" id="display-card-limit" min="4" :max="allCards.length || 4"
              v-model.number="displayLimitDraft" />
          </div>

          <div class="settings-actions">
            <button id="toggle-english-btn" class="btn toggle" :class="{ off: !showEnglish }" @click="toggleEnglish"
              type="button">
              English: {{ showEnglish ? "ON" : "OFF" }}
            </button>

            <button id="mode-btn" class="btn mode" type="button"
              @click="modeDraft = (modeDraft === 'bomb' ? 'mushroom' : 'bomb')">
              Mode: {{ modeDraft === "bomb" ? "Bomb" : "Taiyaki" }}
            </button>
          </div>

          <div class="settings-actions bottom">
            <button class="btn ghost restart-btn" type="button" @click="restart">Reset</button>
            <button class="btn primary apply-btn" type="button" @click="applySettings">Apply</button>
            <button class="btn danger cancel-btn" type="button" @click="closeSettingsMenu">Cancel</button>
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">

import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameTransitStore, type Flashcard as TransitCard, type Mode } from '@/stores/gameTransit'

/** ===== Types for this view ===== */
type BackKind = 'bomb' | 'mushroom' | 'safe' | 'no' | 'blank' | null
interface GameCard extends TransitCard {
  isTarget: boolean
  isFlipped: boolean
  backKind: BackKind
}

/** ===== Config ===== */
const BOMB_FLIP_DELAY_MS = 2000       // time before auto-flipping the rest (bomb mode)
const MUSHROOM_HIT_ANIM_MS = 2000     // keep glow/bounce on screen for ~2s
const TRANSIT_KEY = 'eitake.bombgame.transit.v1' // sessionStorage key

/** ===== Props (optional; view can be driven entirely by transit store) ===== */
const props = withDefaults(
  defineProps<{
    cards?: TransitCard[]
    modeDefault?: Mode
    displayCount?: number
    showEnglishDefault?: boolean
  }>(),
  {
    displayCount: 21,
    // ON by default now
    showEnglishDefault: true,
  }
)

/** ===== Router / Store ===== */
const router = useRouter()
const transit = useGameTransitStore()

/** ===== Local state ===== */
const showEnglish = ref<boolean>(props.showEnglishDefault) // starts true
const mode = ref<Mode>(props.modeDefault ?? (transit.mode ?? 'bomb'))
const displayLimit = ref<number>(props.displayCount)

const showSettings = ref(false)
const displayLimitDraft = ref(displayLimit.value)
const showEnglishDraft = ref(showEnglish.value)
const modeDraft = ref<Mode>(mode.value)

const allCards = ref<TransitCard[]>([])
const visibleCards = ref<GameCard[]>([])
const ended = ref(false)
const hitIndex = ref<number | null>(null)

/** ===== Assets (Vite URLs) ===== */
const homeIcon = new URL('@/assets/images/icons/back-icon.png', import.meta.url).toString()
const settingsIcon = new URL('@/assets/images/icons/settings-icon.png', import.meta.url).toString()
const imgResultBomb = new URL('@/assets/images/games/bombgame/result-bomb.png', import.meta.url).toString()
const imgResultMushroom = new URL('@/assets/images/games/bombgame/result-taiyaki.png', import.meta.url).toString()
const imgResultSafe = new URL('@/assets/images/games/bombgame/result-safe.png', import.meta.url).toString()
const imgResultNo = new URL('@/assets/images/games/bombgame/result-no.png', import.meta.url).toString()

// Sounds
const flipSfx = new Audio(new URL('@/assets/sounds/arcade_beep_01.mp3', import.meta.url).toString())
const bombSfx = new Audio(new URL('@/assets/sounds/bomb.mp3', import.meta.url).toString())
const mushroomSfx = new Audio(new URL('@/assets/sounds/fortunegame/daikichi.mp3', import.meta.url).toString())
flipSfx.preload = 'auto'
bombSfx.preload = 'auto'
mushroomSfx.preload = 'auto'

/** ===== Derived ===== */
const sourceCards = computed<TransitCard[]>(() =>
  props.cards?.length ? props.cards : transit.cards
)

/** ===== Helpers ===== */
function shuffleInPlace<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
function cardAlt(card: TransitCard) {
  return card.english || card.japanese?.kanji || 'card'
}
function resultImg(card: GameCard) {
  switch (card.backKind) {
    case 'bomb': return imgResultBomb
    case 'mushroom': return imgResultMushroom
    case 'safe': return imgResultSafe
    case 'no': return imgResultNo
    default: return ''
  }
}
function resultAlt(card: GameCard) {
  switch (card.backKind) {
    case 'bomb': return 'Bomb'
    case 'mushroom': return 'Mushroom'
    case 'safe': return 'Safe'
    case 'no': return 'No'
    case 'blank': return 'Blank'
    default: return ''
  }
}
function pickVisible(cards: TransitCard[], limit: number): GameCard[] {
  const picked = cards.slice(0, limit)
  const targetIndex = Math.floor(Math.random() * Math.max(1, picked.length))
  return picked.map((c, i) => ({
    ...c,
    isTarget: i === targetIndex,
    isFlipped: false,
    backKind: null,
  }))
}

function toggleEnglish() {
  showEnglish.value = !showEnglish.value      // live update cards immediately
  showEnglishDraft.value = showEnglish.value  // keep draft in sync with current
}

/** Image preloading */
const preloaded = new Set<string>()
function preloadImage(url: string) {
  if (!url || preloaded.has(url)) return
  const img = new Image()
  img.decoding = 'async'
  img.loading = 'eager'
  img.src = url
  preloaded.add(url)
}
function preloadRoundImages() {
  // Preload all faces in this round
  visibleCards.value.forEach(c => preloadImage(c.image_url))
    // Preload result images
    ;[imgResultBomb, imgResultMushroom, imgResultSafe, imgResultNo].forEach(preloadImage)
}

function setUpGame() {
  ended.value = false
  hitIndex.value = null
  const pool = shuffleInPlace([...allCards.value])
  const limit = clamp(displayLimit.value, 4, pool.length || 4)
  visibleCards.value = pickVisible(pool, limit)
  preloadRoundImages()
  persistSession() // keep current mode/cards live for refresh
}
function autoFlipRestBlank() {
  visibleCards.value.forEach(c => {
    if (!c.isFlipped) {
      c.isFlipped = true
      c.backKind = 'blank' // blank green back, no image
    }
  })
}
function persistSession() {
  try {
    const payload = { cards: allCards.value, mode: mode.value }
    sessionStorage.setItem(TRANSIT_KEY, JSON.stringify(payload))
  } catch { /* ignore */ }
}
function hydrateFromSession() {
  try {
    const raw = sessionStorage.getItem(TRANSIT_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.cards) && parsed.cards.length) {
      transit.set({ cards: parsed.cards, mode: parsed.mode === 'mushroom' ? 'mushroom' : 'bomb' })
    }
  } catch { /* ignore */ }
}

/** ===== v-fittext directive (auto-shrink to fit container) =====
 * Usage: v-fittext="{ minRatio, maxRatio, minPx, maxPx }"
 * - Ratios are relative to the card width.
 */
const resizeObservers = new WeakMap<Element, ResizeObserver>()
const fitTextDirective = {
  mounted(el: HTMLElement, binding: any) {
    const opts = binding?.value || {}
    const ro = new ResizeObserver(() => fit(el, opts))
    resizeObservers.set(el, ro)
    ro.observe(el)
    // also observe the card element (parent size changes)
    const parent = el.closest('.card')
    if (parent) ro.observe(parent)
    // initial
    fit(el, opts)
    window.addEventListener('resize', onWinResize)
  },
  updated(el: HTMLElement, binding: any) {
    fit(el, binding?.value || {})
  },
  unmounted(el: HTMLElement) {
    const ro = resizeObservers.get(el)
    if (ro) {
      ro.disconnect()
      resizeObservers.delete(el)
    }
    window.removeEventListener('resize', onWinResize)
  }
}
function onWinResize() {
  // handled by ResizeObserver too, but this smooths quick viewport changes
  document.querySelectorAll<HTMLElement>('.card-text').forEach(el => fit(el, {}))
}
function fit(el: HTMLElement, opts: { minRatio?: number; maxRatio?: number; minPx?: number; maxPx?: number }) {
  const parent = el.parentElement as HTMLElement | null
  if (!parent) return
  // Available box for text (its own content box)
  const boxW = el.clientWidth || parent.clientWidth
  const boxH = el.clientHeight || Math.max(28, parent.clientHeight * 0.22) // ~22% of card reserved for text
  // Card width is a good scaler for initial guess
  const card = parent.closest('.card') as HTMLElement | null
  const cw = card ? card.clientWidth : boxW

  const minRatio = typeof opts.minRatio === 'number' ? opts.minRatio : 0.075  // ~7.5% of card width
  const maxRatio = typeof opts.maxRatio === 'number' ? opts.maxRatio : 0.14   // ~14% of card width
  const minPx = typeof opts.minPx === 'number' ? opts.minPx : 10
  const maxPx = typeof opts.maxPx === 'number' ? opts.maxPx : 28

  let size = clamp(Math.round(cw * maxRatio), minPx, maxPx)
  el.style.fontSize = size + 'px'
  el.style.lineHeight = '1.1'
  el.style.whiteSpace = 'normal'
  el.style.wordBreak = 'break-word'
  el.style.overflow = 'hidden'

  const scrolls = () => el.scrollHeight > boxH || el.scrollWidth > boxW
  // Decrease font size until it fits (or hits min)
  let guard = 60
  while (scrolls() && guard-- > 0 && size > Math.max(minPx, Math.round(cw * minRatio))) {
    size -= 1
    el.style.fontSize = size + 'px'
  }
}

defineDirective('fittext', fitTextDirective)
/** Vue <script setup> helper */
function defineDirective(name: string, def: any) {
  // @ts-ignore - global registration for <script setup>
  const app = (getCurrentInstance()?.appContext.app) || null
  if (app) app.directive(name, def)
}

import { getCurrentInstance } from 'vue'

/** ===== Lifecycle ===== */
onMounted(() => {
  // If nothing in the store (e.g., after a refresh), hydrate from session
  if (!sourceCards.value.length) {
    hydrateFromSession()
  }
  allCards.value = [...(sourceCards.value.length ? sourceCards.value : transit.cards)]
  // Preload all candidate faces (not just visible)
  allCards.value.forEach(c => preloadImage(c.image_url))
    // Also ensure result images are primed
    ;[imgResultBomb, imgResultMushroom, imgResultSafe, imgResultNo].forEach(preloadImage)
  setUpGame() // refresh behaves like "New Round"
})

onBeforeUnmount(() => {
  // clean up listeners registered by directive if any remained
  window.removeEventListener('resize', onWinResize)
})

/** ===== Interactions ===== */
function onCardClick(card: GameCard, idx: number) {
  if (ended.value || card.isFlipped) return

  // flip sfx + flip this card
  flipSfx.currentTime = 0
  flipSfx.play().catch(() => { /* ignore */ })
  card.isFlipped = true

  if (card.isTarget) {
    // show target art
    card.backKind = mode.value === 'bomb' ? 'bomb' : 'mushroom'

    // hit sfx
    const hit = mode.value === 'bomb' ? bombSfx : mushroomSfx
    hit.currentTime = 0
    hit.play().catch(() => { /* ignore */ })

    // mark which index was hit (drives animations)
    hitIndex.value = idx

    if (mode.value === 'bomb') {
      // wait, then flip remaining to blank and end
      window.setTimeout(() => {
        autoFlipRestBlank()
        ended.value = true
        window.setTimeout(() => (hitIndex.value = null), 200)
      }, BOMB_FLIP_DELAY_MS)
    } else {
      // mushroom mode: end immediately, but keep bounce/glow visible for a bit
      ended.value = true
      window.setTimeout(() => (hitIndex.value = null), MUSHROOM_HIT_ANIM_MS)
    }
  } else {
    // non-target -> safe/no depending on mode
    card.backKind = mode.value === 'bomb' ? 'safe' : 'no'
  }
}
function restart() {
  setUpGame()
  closeSettingsMenu()
}
function toggleSettingsMenu() {
  showSettings.value = !showSettings.value
  if (showSettings.value) {
    displayLimitDraft.value = displayLimit.value
    showEnglishDraft.value = showEnglish.value
    modeDraft.value = mode.value
  }
}
function closeSettingsMenu() {
  showSettings.value = false
}
function applySettings() {
  displayLimit.value = clamp(displayLimitDraft.value || 21, 4, allCards.value.length || 21)
  showEnglish.value = !!showEnglishDraft.value
  mode.value = modeDraft.value
  closeSettingsMenu()
  setUpGame()
}
function onExit() {
  try { router.back() } catch { /* ignore */ }
}
</script>

<style scoped>
/* --- Page base --- */
.bomb-game-page {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji';
  text-align: center;
  min-height: 100vh;
  padding: 60px 100px 60px;
}

#game-title {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 0 rgba(68, 61, 61, 0.7);
}

/* --- Icon-only top buttons --- */
.home-button,
.settings-button {
  position: fixed;
  top: 16px;
  background: transparent;
  border: none;
  padding: 0;
  width: 38px;
  height: 38px;
  cursor: pointer;
  z-index: 1000;
}

.home-button {
  left: 16px;
}

.settings-button {
  right: 16px;
}

.home-button img,
.settings-button img {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .25));
  transition: transform .12s ease-in-out;
}

.home-button:hover img {
  transform: scale(1.06);
}

.settings-button:hover img {
  transform: scale(1.06) rotate(6deg);
}

/* --- Settings backdrop (theme modal tokens) --- */
/* Wrapper anchored under the settings icon */
.settings-wrap {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1100;
}

/* Backdrop blur overlay (MemoryGame-style, weak) */
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: color-mix(in srgb, #000 16%, transparent);
  backdrop-filter: blur(4px) saturate(115%);
  -webkit-backdrop-filter: blur(4px) saturate(115%);
}

/* Drop-down container (MemoryGame-style) */
.settings-dropdown {
  position: absolute;
  top: 52px;
  right: 0;
  width: min(360px, calc(100vw - 18px));
  border-radius: var(--radius-lg);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  box-shadow: var(--modal-shadow);
  overflow: hidden;
  z-index: 90;
  padding: 12px;
  text-align: left;
}

.settings-title {
  margin: 0 0 10px;
  font-weight: 950;
  font-size: 18px;
  color: var(--modal-on-surface);
}

/* row */
.settings-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  align-items: center;
  margin: 10px 0 12px;
}

.settings-label {
  font-size: 12px;
  color: var(--modal-on-surface-soft);
  font-weight: 800;
}

.settings-input {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--select-menu-border);
  background: var(--select-menu-surface);
  color: var(--select-menu-on);
  padding: 10px 12px;
  outline: none;
}
.settings-input:focus-visible {
  box-shadow: var(--focus-ring);
}

/* buttons */
.settings-actions {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}
.settings-actions.bottom {
  grid-template-columns: 1fr 1fr 1fr;
}

.btn {
  border-radius: var(--radius-md);
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 900;
  border: 1px solid transparent;
  box-shadow: var(--elevation-1);
  transition: transform 140ms ease, filter 140ms ease;
}
.btn:hover {
  transform: scale(1.03);
  filter: brightness(1.02);
}
.btn:active { transform: scale(0.99); }
.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border-color: var(--btn-primary-border);
}
.btn.ghost {
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  border-color: var(--btn-ghost-border);
}
.btn.danger {
  background: color-mix(in srgb, var(--btn-danger-bg) 18%, var(--neutral-0) 82%);
  color: var(--btn-danger-on);
  border-color: var(--btn-danger-border);
}

/* Toggle + mode buttons */
.btn.toggle {
  background: color-mix(in srgb, var(--accent-warning) 18%, var(--neutral-0) 82%);
  color: var(--modal-on-surface);
  border-color: color-mix(in srgb, var(--accent-warning) 35%, #000 65%);
}
.btn.toggle.off {
  background: color-mix(in srgb, var(--accent-danger) 16%, var(--neutral-0) 84%);
  color: var(--btn-danger-on);
  border-color: var(--btn-danger-border);
}

.btn.mode {
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  border-color: var(--btn-ghost-border);
}
.settings-dropdown[data-mode="bomb"] .btn.mode {
  background: color-mix(in srgb, var(--accent-danger) 16%, var(--neutral-0) 84%);
  color: var(--btn-danger-on);
  border-color: var(--btn-danger-border);
}
.settings-dropdown[data-mode="mushroom"] .btn.mode {
  background: color-mix(in srgb, var(--accent-success) 16%, var(--neutral-0) 84%);
  color: var(--btn-success-on);
  border-color: var(--btn-success-border);
}

/* Open/close animations */
.settings-drop-enter-active { animation: dropIn 180ms ease-out both; }
.settings-drop-leave-active { animation: slideUpOut 160ms ease-in both; }

@keyframes dropIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes slideUpOut {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-10px) scale(0.98); }
}

/* Responsive */
@media (max-width: 520px) {
  .settings-row { grid-template-columns: 1fr; }
  .settings-actions.bottom { grid-template-columns: 1fr; }
}
/* --- Grid (match Sharknado) --- */
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
  /* fixed size; same before/after flip */
  perspective: 1000px;
  position: relative;
  cursor: pointer;
  background-color: transparent;
}

.card:hover {
  transform: scale(1.03);
}

.card-inner {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  position: relative;
  transition: transform 540ms cubic-bezier(.2, .6, .2, 1);
  border-radius: 12px;
  box-sizing: border-box;
}

.card.revealed .card-inner {
  transform: rotateY(180deg);
}

/* Front/Back panes keep identical padding/borders so size never shifts */
.card-front,
.card-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  /* space between image and text */
  border: 2px solid #0f766e;
  background-color: #ffffff;
  /* white on front */
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(2, 6, 23, .08);
  overflow: hidden;
  padding: 8px;
}

/* FRONT content centered as a group */
.card-media {
  flex: 0 1 auto;
  max-height: 72%;
  /* ensure room for English below when present */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.card-img,
.result-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
}

/* English text: centered, no absolute positioning = no weird gaps */
.card-text {
  text-align: center;
  font-weight: 800;
  font-size: 16px;
  /* v-fittext can still resize if used */
  color: #0b1f1d;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .4);
  line-height: 1.12;
  pointer-events: none;
  word-break: break-word;
}

/* BACK: keep strong color fill so flipped state is obvious */
.card-back {
  transform: rotateY(180deg);
  background-color: #fff2cc;
  /* default filled back */
}

.card-back.blank {
  background-color: #b8f5c6;
  /* shown for auto-flipped in bomb mode */
}

/* --- Bomb reveal animation (no size change) --- */
@keyframes bombRevealShrink {
  0% {
    transform: rotateY(180deg) scale(1.15);
  }

  100% {
    transform: rotateY(180deg) scale(1);
  }
}

.bomb-anim {
  animation: bombRevealShrink 2s ease-out forwards;
  transition: none !important;
}

/* --- Mushroom bounce + yellow glow --- */
@keyframes mushroomBounce {
  0% {
    transform: rotateY(180deg) translateY(0) scale(1);
  }

  15% {
    transform: rotateY(180deg) translateY(-8px) scale(1.06);
  }

  30% {
    transform: rotateY(180deg) translateY(0) scale(1.02);
  }

  45% {
    transform: rotateY(180deg) translateY(-6px) scale(1.05);
  }

  60% {
    transform: rotateY(180deg) translateY(0) scale(1.02);
  }

  75% {
    transform: rotateY(180deg) translateY(-3px) scale(1.03);
  }

  100% {
    transform: rotateY(180deg) translateY(0) scale(1);
  }
}

.mushroom-anim {
  animation: mushroomBounce 2s ease-out both;
  transition: none !important;
}

@keyframes mushroomGlow {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 221, 64, 0.0);
  }

  20% {
    box-shadow: 0 0 22px 6px rgba(255, 221, 64, 0.9);
  }

  50% {
    box-shadow: 0 0 14px 4px rgba(255, 221, 64, 0.6);
  }

  80% {
    box-shadow: 0 0 24px 8px rgba(255, 221, 64, 0.95);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 221, 64, 0.0);
  }
}

.card-back.glow-yellow {
  animation: mushroomGlow 2s ease-out both;
}

.card-grid.ended .card .card-inner {
  transition: transform 0.35s;
}

.card-grid.ended .card:hover {
  transform: none;
}

/* ---------- Responsive (match Sharknado) ---------- */
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
  .card {
    width: 140px;
    height: 180px;
  }

  .card-grid {
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}

@media (min-width: 1440px) {
  .card {
    width: 160px;
    height: 200px;
  }

  .card-grid {
    gap: 28px;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}

@media (min-width: 1920px) {
  .card {
    width: 200px;
    height: 260px;
  }

  .card-grid {
    gap: 32px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>
