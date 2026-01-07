<!-- src/views/flashcard-system/ShuffleGame.vue -->
<template>
  <section class="shuffle-game-page">
    <!-- Fixed invisible header so icons never get displaced by layout -->
    <header class="game-header" aria-label="Game header">
      <button class="home-button" type="button" @click="onExit" aria-label="Back">
        <img :src="homeIcon" alt="" />
      </button>

      <div class="settings-wrap" ref="settingsWrap">
        <button
          class="settings-button"
          type="button"
          @click="toggleSettingsMenu"
          aria-haspopup="menu"
          :aria-expanded="showSettings"
          aria-controls="settings-menu"
        >
          <img :src="settingsIcon" alt="" />
        </button>

        <!-- Backdrop -->
        <div v-if="showSettings" class="settings-backdrop" @click="closeSettings" aria-hidden="true"></div>

        <Transition name="settings-drop">
          <div v-if="showSettings" id="settings-menu" class="settings-dropdown" role="menu">
            <h3 class="settings-title">Shuffle Settings</h3>

            <!-- Always small-screen style: label above, full-width buttons -->
            <div class="menu-block">
              <div class="block-label">Mode</div>
              <div class="block-buttons two">
                <button
                  class="btn ghost"
                  :class="{ active: modeDraft === 'practice' }"
                  type="button"
                  @click="modeDraft = 'practice'"
                >
                  Practice
                </button>
                <button
                  class="btn ghost"
                  :class="{ active: modeDraft === 'game' }"
                  type="button"
                  @click="modeDraft = 'game'"
                >
                  Game
                </button>
              </div>
            </div>

            <div class="menu-block">
              <div class="block-label">Cards</div>
              <div class="block-buttons three">
                <button class="btn ghost" :class="{ active: countDraft === 3 }" type="button" @click="countDraft = 3">
                  3
                </button>
                <button class="btn ghost" :class="{ active: countDraft === 5 }" type="button" @click="countDraft = 5">
                  5
                </button>
                <button class="btn ghost" :class="{ active: countDraft === 7 }" type="button" @click="countDraft = 7">
                  7
                </button>
              </div>
            </div>

            <div class="menu-block">
              <div class="block-label">Shuffle speed</div>
              <div class="block-buttons three">
                <button
                  class="btn ghost"
                  :class="{ active: speedDraft === 'easy' }"
                  type="button"
                  @click="speedDraft = 'easy'"
                >
                  Easy
                </button>
                <button
                  class="btn ghost"
                  :class="{ active: speedDraft === 'fast' }"
                  type="button"
                  @click="speedDraft = 'fast'"
                >
                  Fast
                </button>
                <button
                  class="btn ghost"
                  :class="{ active: speedDraft === 'impossible' }"
                  type="button"
                  @click="speedDraft = 'impossible'"
                >
                  Impossible
                </button>
              </div>
            </div>

            <div class="menu-block">
              <div class="block-label">English</div>
              <button class="btn toggle full" :class="{ off: !showEnglish }" type="button" @click="showEnglish = !showEnglish">
                English: {{ showEnglish ? 'ON' : 'OFF' }}
              </button>
            </div>

            <div class="settings-actions bottom">
              <button class="btn ghost" type="button" @click="newRound" :disabled="isBusy">Reset</button>
              <button class="btn primary" type="button" @click="applySettings" :disabled="isBusy">Apply</button>
            </div>
          </div>
        </Transition>
      </div>
    </header>

    <!-- Top target (Game mode only, compact) -->
    <div class="target-wrap" v-if="mode === 'game' && targetCard">
      <div class="target-label">Find this card</div>

      <div class="target-card-shell">
        <!-- Face up always -->
        <div class="target-card">
          <div class="target-front">
            <div class="card-media">
              <img class="card-img" :src="targetCard.image_url" :alt="cardAlt(targetCard)" decoding="async" />
            </div>
            <div v-if="showEnglish" class="card-text">
              {{ targetCard.english }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button class="btn primary" type="button" @click="onStartOrShuffle" :disabled="isBusy || roundCards.length === 0">
        {{ primaryButtonLabel }}
      </button>

      <button class="btn ghost" type="button" @click="newRound" :disabled="isBusy || allCards.length === 0">
        New cards
      </button>
    </div>

    <!-- Stage -->
    <div class="stage-wrap">
      <div ref="stageEl" class="stage" :class="{ busy: isBusy, impossible: shuffleSpeed === 'impossible', easy: shuffleSpeed === 'easy' }">
        <div
          v-for="c in roundCards"
          :key="c.key"
          class="card"
          :class="{
            revealed: c.isFaceDown,
            'can-click': canClickCard,
            'correct-hit': mode === 'game' && c.id === targetId && !c.isFaceDown,
            'wrong-pick': mode === 'game' && c.id === pickedId && pickedId !== targetId && !c.isFaceDown,
            bounce: mode === 'game' && foundCorrect && c.id === targetId
          }"
          :style="cardStyle(c)"
          role="button"
          :aria-pressed="!c.isFaceDown"
          @click="onCardClick(c)"
        >
          <div class="card-inner">
            <div class="card-front">
              <div class="card-media">
                <img class="card-img" :src="c.image_url" :alt="cardAlt(c)" decoding="async" />
              </div>
              <div v-if="showEnglish" class="card-text">
                {{ c.english }}
              </div>
            </div>

            <div class="card-back"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!roundCards.length" class="empty-state">
      No cards available. Open this game from a deck so it can hydrate cards.
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameTransitStore, type Flashcard as TransitCard } from '@/stores/gameTransit'

type ShuffleMode = 'practice' | 'game'
type Phase = 'idle' | 'showing' | 'shuffling' | 'guess' | 'resolved'
type ShuffleSpeed = 'easy' | 'fast' | 'impossible'

interface RoundCard extends TransitCard {
  key: string
  spotIndex: number | null
  isFaceDown: boolean
  tempX?: number | null
  tempY?: number | null
}

const TRANSIT_KEY = 'eitake.shufflegame.transit.v1'

const props = withDefaults(
  defineProps<{
    cards?: TransitCard[]
    modeDefault?: ShuffleMode
    countDefault?: number
    showEnglishDefault?: boolean
  }>(),
  {
    modeDefault: 'practice',
    countDefault: 3,
    showEnglishDefault: true
  }
)

const router = useRouter()
const transit = useGameTransitStore()

/** ===== Assets ===== */
const homeIcon = new URL('@/assets/images/icons/back-icon.png', import.meta.url).toString()
const settingsIcon = new URL('@/assets/images/icons/settings-icon.png', import.meta.url).toString()
const backTexture = new URL('@/assets/images/backgrounds/repeating-fans-green.jpg', import.meta.url).toString()

/** ===== SFX ===== */
const flipSfx = new Audio(new URL('@/assets/sounds/Wood_Block.ogg', import.meta.url).toString())
const wrongSfx = new Audio(new URL('@/assets/sounds/arcade_beep_01.mp3', import.meta.url).toString())
const cheerSfx = new Audio(new URL('@/assets/sounds/fanfare.mp3', import.meta.url).toString())
const drumrollSfx = new Audio(new URL('@/assets/sounds/drum-roll.mp3', import.meta.url).toString())

;[flipSfx, wrongSfx, cheerSfx, drumrollSfx].forEach(a => (a.preload = 'auto'))

function resetAndPlay(a: HTMLAudioElement) {
  try {
    a.pause()
    a.currentTime = 0
    void a.play()
  } catch {
    /* ignore */
  }
}

/** ===== Session hydration ===== */
function persistToSession(payload: { cards: TransitCard[] }) {
  try {
    sessionStorage.setItem(TRANSIT_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}
function hydrateFromSession() {
  try {
    const raw = sessionStorage.getItem(TRANSIT_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed?.cards) && parsed.cards.length) {
      transit.set({ cards: parsed.cards })
    }
  } catch {
    /* ignore */
  }
}

/** ===== Settings state ===== */
const showSettings = ref(false)
const settingsWrap = ref<HTMLElement | null>(null)

const mode = ref<ShuffleMode>(props.modeDefault)
const count = ref<number>(clampCount(props.countDefault))
const showEnglish = ref<boolean>(props.showEnglishDefault)

const shuffleSpeed = ref<ShuffleSpeed>('fast') // default = old Easy

const modeDraft = ref<ShuffleMode>(mode.value)
const countDraft = ref<number>(count.value)
const speedDraft = ref<ShuffleSpeed>(shuffleSpeed.value)

function clampCount(n: number) {
  return n === 5 ? 5 : n === 7 ? 7 : 3
}

function toggleSettingsMenu() {
  showSettings.value = !showSettings.value
  if (showSettings.value) {
    modeDraft.value = mode.value
    countDraft.value = count.value
    speedDraft.value = shuffleSpeed.value
  }
}
function closeSettings() {
  showSettings.value = false
}

function applySettings() {
  mode.value = modeDraft.value
  count.value = clampCount(countDraft.value)
  shuffleSpeed.value = speedDraft.value
  closeSettings()
  newRound()
}

/** ===== Cards + round state ===== */
const allCards = ref<TransitCard[]>([])
const roundCards = ref<RoundCard[]>([])

const phase = ref<Phase>('idle')
const isBusy = ref(false)

const targetId = ref<string | null>(null)
const pickedId = ref<string | null>(null)
const foundCorrect = ref(false)

const targetCard = computed(() => {
  if (!targetId.value) return null
  return roundCards.value.find(c => c.id === targetId.value) ?? null
})

const canClickCard = computed(() => {
  if (isBusy.value) return false
  if (!roundCards.value.length) return false

  if (mode.value === 'practice') return phase.value === 'resolved'
  if (mode.value === 'game') return phase.value === 'guess' && !foundCorrect.value
  return false
})

const primaryButtonLabel = computed(() => {
  if (phase.value === 'idle' || phase.value === 'showing') return 'Shuffle'
  if (phase.value === 'shuffling') return 'Shuffling...'
  return 'Shuffle again'
})

/** ===== Stage measurement ===== */
const stageEl = ref<HTMLElement | null>(null)
const stageW = ref(0)
const stageH = ref(0)
let ro: ResizeObserver | null = null

function measureStage() {
  const el = stageEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  stageW.value = r.width
  stageH.value = r.height
}

/** ===== Spots ===== */
const CARD_W = 170
const CARD_H = 230

function spotPositions(n: number) {
  const w = stageW.value || 1200
  const h = stageH.value || 680

  const padX = 10
  const centerY = h * 0.56

  const maxSpan = Math.max(380, w - padX * 2)
  const idealGap = 20
  const needed = n * CARD_W + (n - 1) * idealGap
  const gap = needed <= maxSpan ? idealGap : Math.max(8, Math.floor((maxSpan - n * CARD_W) / Math.max(1, n - 1)))

  const span = n * CARD_W + (n - 1) * gap
  const startX = (w - span) / 2 + CARD_W / 2

  const out: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) out.push({ x: startX + i * (CARD_W + gap), y: centerY })
  return out
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function randomWaitingPoint() {
  const w = stageW.value || 1200
  const h = stageH.value || 680

  const minX = CARD_W * 0.55
  const maxX = Math.max(minX, w - CARD_W * 0.55)
  const minY = CARD_H * 0.45
  const maxY = Math.max(minY, h - CARD_H * 0.55)

  return {
    x: clamp(Math.random() * w, minX, maxX),
    y: clamp(Math.random() * h, minY, maxY)
  }
}

function cardStyle(c: RoundCard) {
  const slots = spotPositions(roundCards.value.length || count.value)
  const inSpot = typeof c.spotIndex === 'number' && c.spotIndex >= 0
  const base = inSpot ? slots[c.spotIndex!] : null

  const x = inSpot ? base?.x : c.tempX
  const y = inSpot ? base?.y : c.tempY

  return {
    left: `${x ?? stageW.value / 2}px`,
    top: `${y ?? stageH.value / 2}px`,
    zIndex: 10 + (c.spotIndex ?? 0),
    '--back-texture': `url("${backTexture}")`
  } as any
}

/** ===== Helpers ===== */
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function shuffleInPlace<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** ===== Shuffle tuning ===== */
function speedTuning() {
  if (shuffleSpeed.value === 'easy') return { tickMs: 240, moveMs: 520 }
  if (shuffleSpeed.value === 'impossible') return { tickMs: 70, moveMs: 140 }
  return { tickMs: 130, moveMs: 260 } // fast
}

/** ===== Spot accounting ===== */
function currentOccupiedSet(exceptId?: string) {
  const s = new Set<number>()
  for (const c of roundCards.value) {
    if (exceptId && c.id === exceptId) continue
    if (typeof c.spotIndex === 'number') s.add(c.spotIndex)
  }
  return s
}

function vacantSpots(): number[] {
  const n = roundCards.value.length
  const occ = currentOccupiedSet()
  const out: number[] = []
  for (let i = 0; i < n; i++) if (!occ.has(i)) out.push(i)
  return out
}

function assignCardToSpotSafely(card: RoundCard, spot: number) {
  const occ = currentOccupiedSet(card.id)
  if (occ.has(spot)) return false

  card.spotIndex = spot
  card.tempX = null
  card.tempY = null
  return true
}

function moveCardToWaiting(card: RoundCard) {
  const p = randomWaitingPoint()
  card.spotIndex = null
  card.tempX = p.x
  card.tempY = p.y
}

/** ===== Shuffle mechanics (updated rules) =====
 * - Total duration: 3000ms
 * - Each move must use a DIFFERENT card than the previous move
 * - Each card must move at least once
 * - If a card is in WAITING, it MUST be moved to an OPEN spot (no 50/50 waiting in that case)
 * - Otherwise: if open spots exist, 50/50 take open spot vs go waiting; if no open spots, go waiting.
 */
async function runShuffleSequence() {
  if (!roundCards.value.length) return

  isBusy.value = true
  phase.value = 'shuffling'
  pickedId.value = null
  foundCorrect.value = false

  if (mode.value === 'game') {
    if (!targetId.value) targetId.value = pickRandom(roundCards.value).id
  } else {
    targetId.value = null
  }

  // Flip down
  resetAndPlay(flipSfx)
  roundCards.value.forEach(c => (c.isFaceDown = true))
  await sleep(220)

  // Drumroll once
  resetAndPlay(drumrollSfx)

  const { tickMs, moveMs } = speedTuning()
  const endAt = performance.now() + 3000

  // Track “each card must move at least once”
  const movedOnce = new Set<string>()
  let lastMovedId: string | null = null

  // Build a deterministic “must-move” order first (so every card moves at least once)
  const mustMoveQueue = shuffleInPlace([...roundCards.value.map(c => c.id)])

  function pickNextCardId(): string {
    // Priority 1: ensure each card moves at least once
    // Also enforce: not the same as last move (if possible)
    if (mustMoveQueue.length) {
      if (mustMoveQueue[0] !== lastMovedId) return mustMoveQueue.shift() as string

      // if first equals last, try to find another in queue
      const idx = mustMoveQueue.findIndex(id => id !== lastMovedId)
      if (idx >= 0) {
        const [id] = mustMoveQueue.splice(idx, 1)
        return id
      }
      // unavoidable (only one left)
      return mustMoveQueue.shift() as string
    }

    // Priority 2: random card, but not same as last (if possible)
    const candidates = roundCards.value.filter(c => c.id !== lastMovedId)
    if (candidates.length) return pickRandom(candidates).id
    return pickRandom(roundCards.value).id
  }

  while (performance.now() < endAt) {
    const nextId = pickNextCardId()
    const card = roundCards.value.find(c => c.id === nextId)
    if (!card) {
      await sleep(tickMs)
      continue
    }

    const open = vacantSpots()

    // Rule: if card is waiting, it MUST go to an open spot (if any exist)
    if (card.spotIndex === null) {
      if (open.length > 0) {
        const spot = open[Math.floor(Math.random() * open.length)]
        const ok = assignCardToSpotSafely(card, spot)
        if (!ok) {
          // If collision (rare), try any other open spot; otherwise stay waiting (fallback)
          const open2 = vacantSpots()
          const spot2 = open2.length ? open2[Math.floor(Math.random() * open2.length)] : null
          if (typeof spot2 === 'number') assignCardToSpotSafely(card, spot2)
        }
      } else {
        // no open spots available, keep waiting but still "move" to a new waiting coordinate
        moveCardToWaiting(card)
      }
    } else {
      // Card currently holds a spot
      if (open.length === 0) {
        moveCardToWaiting(card)
      } else {
        if (Math.random() < 0.5) {
          const spot = open[Math.floor(Math.random() * open.length)]
          const ok = assignCardToSpotSafely(card, spot)
          if (!ok) moveCardToWaiting(card)
        } else {
          moveCardToWaiting(card)
        }
      }
    }

    movedOnce.add(card.id)
    lastMovedId = card.id

    // Let motion breathe; move duration handled by CSS transitions
    await sleep(tickMs)
  }

  // Final settle: any waiting cards must take remaining vacant spots (unique), all at once
  const remaining = vacantSpots()
  const waiting = roundCards.value.filter(c => c.spotIndex === null)

  shuffleInPlace(remaining)
  for (const c of waiting) {
    const spot = remaining.shift()
    if (typeof spot === 'number') {
      assignCardToSpotSafely(c, spot)
    }
  }

  // Ensure absolutely all cards end in a spot (should be true). If not, force assign.
  const remaining2 = vacantSpots()
  for (const c of roundCards.value) {
    if (c.spotIndex === null) {
      const spot = remaining2.shift()
      if (typeof spot === 'number') assignCardToSpotSafely(c, spot)
    }
  }

  // Allow the final “everyone moves into place” to finish
  await sleep(Math.max(120, moveMs))

  phase.value = mode.value === 'game' ? 'guess' : 'resolved'
  isBusy.value = false
}

/** ===== UI actions ===== */
async function onStartOrShuffle() {
  if (isBusy.value) return
  if (!roundCards.value.length) return
  await runShuffleSequence()
}

function onCardClick(c: RoundCard) {
  if (!canClickCard.value) return

  if (mode.value === 'practice') {
    resetAndPlay(flipSfx)
    c.isFaceDown = false
    return
  }

  if (mode.value !== 'game' || phase.value !== 'guess' || foundCorrect.value) return

  pickedId.value = c.id
  resetAndPlay(flipSfx)
  c.isFaceDown = false

  const correct = c.id === targetId.value
  if (correct) {
    foundCorrect.value = true
    resetAndPlay(cheerSfx)
    phase.value = 'resolved'
  } else {
    resetAndPlay(wrongSfx)
  }
}

function newRound() {
  if (isBusy.value) return
  if (!allCards.value.length) return

  const pool = shuffleInPlace([...allCards.value])
  const n = Math.min(count.value, pool.length)

  const picked = pool.slice(0, n).map((c, i) => ({
    ...c,
    key: `${c.id}-${Math.random().toString(16).slice(2)}`,
    spotIndex: i, // unique spots
    isFaceDown: false,
    tempX: null,
    tempY: null
  }))

  roundCards.value = picked
  targetId.value = mode.value === 'game' ? pickRandom(picked).id : null
  pickedId.value = null
  foundCorrect.value = false
  phase.value = 'showing'

  nextTick(() => measureStage())
}

/** ===== Misc ===== */
function cardAlt(card: TransitCard) {
  return card.english || card.japanese?.kanji || 'flashcard'
}
function onExit() {
  try {
    router.back()
  } catch {
    /* ignore */
  }
}

/** ===== Mount / Unmount ===== */
onMounted(() => {
  hydrateFromSession()

  const fromProps = Array.isArray(props.cards) && props.cards.length ? props.cards : null
  const fromTransit = Array.isArray(transit.cards) && transit.cards.length ? transit.cards : null
  const source = fromProps ?? fromTransit ?? []

  allCards.value = source
  if (source.length) persistToSession({ cards: source })

  measureStage()
  if (stageEl.value) {
    ro = new ResizeObserver(() => measureStage())
    ro.observe(stageEl.value)
  }

  const onDocClick = (e: MouseEvent) => {
    if (!showSettings.value) return
    const wrap = settingsWrap.value
    if (!wrap) return
    if (e.target instanceof Node && !wrap.contains(e.target)) closeSettings()
  }
  document.addEventListener('mousedown', onDocClick)
  ;(onMounted as any)._shuffle_onDocClick = onDocClick

  if (allCards.value.length) newRound()
})

onBeforeUnmount(() => {
  if (ro && stageEl.value) ro.disconnect()
  const onDocClick = (onMounted as any)._shuffle_onDocClick as ((e: MouseEvent) => void) | undefined
  if (onDocClick) document.removeEventListener('mousedown', onDocClick)
})
</script>

<style scoped>
/* --- Page base --- */
.shuffle-game-page {
  text-align: center;
  min-height: 100vh;
  padding: 20px 24px 40px;
  box-sizing: border-box;
}

/* --- Fixed invisible header --- */
.game-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  z-index: 1200;
  pointer-events: none;
}
.game-header > * {
  pointer-events: auto;
}

/* --- Icon buttons --- */
.home-button,
.settings-button {
  position: absolute;
  top: 14px;
  background: transparent;
  border: none;
  padding: 0;
  width: 38px;
  height: 38px;
  cursor: pointer;
}
.home-button {
  left: 14px;
}
.settings-wrap {
  position: absolute;
  top: 14px;
  right: 14px;
  max-width: calc(100vw - 28px);
}
.settings-button {
  right: 0;
}

.home-button img,
.settings-button img {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
  transition: transform 0.12s ease-in-out;
}
.home-button:hover img {
  transform: scale(1.06);
}
.settings-button:hover img {
  transform: scale(1.06) rotate(6deg);
}

/* --- Settings --- */
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: color-mix(in srgb, #000 16%, transparent);
  backdrop-filter: blur(4px) saturate(115%);
  -webkit-backdrop-filter: blur(4px) saturate(115%);
}

.settings-dropdown {
  position: absolute;
  top: 52px;
  right: 0;
  width: min(380px, calc(100vw - 24px));
  border-radius: var(--radius-lg);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  box-shadow: var(--modal-shadow);
  overflow: hidden;
  z-index: 90;
  padding: 12px;
  text-align: left;
  box-sizing: border-box;
}

.settings-title {
  margin: 0 0 12px;
  font-weight: 950;
  font-size: 18px;
  color: var(--modal-on-surface);
}

/* Always “small screen” layout blocks */
.menu-block {
  display: grid;
  gap: 8px;
  margin: 10px 0 12px;
}
.block-label {
  font-size: 12px;
  color: var(--modal-on-surface-soft);
  font-weight: 900;
  margin-left: 2px;
}
.block-sub {
  font-size: 11px;
  line-height: 1.2;
  color: var(--modal-on-surface-soft);
  padding-right: 6px;
  box-sizing: border-box;
}

.block-buttons {
  display: grid;
  gap: 10px;
  padding-right: 6px; /* keep away from right edge */
  box-sizing: border-box;
}
.block-buttons.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.block-buttons.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.block-buttons .btn {
  min-width: 0;
  width: 100%;
  padding-left: 10px;
  padding-right: 10px;
}

/* Buttons (tokenized) */
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
.btn:active {
  transform: scale(0.99);
}
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
.btn.active {
  filter: brightness(1.06);
  transform: scale(1.02);
}
.btn.full {
  width: 100%;
}

/* Actions */
.settings-actions.bottom {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}
.settings-drop-enter-active {
  animation: dropIn 180ms ease-out both;
}
.settings-drop-leave-active {
  animation: slideUpOut 160ms ease-in both;
}
@keyframes dropIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes slideUpOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
}

/* --- Target --- */
.target-wrap {
  margin: 10px auto 8px;
  padding: 0;
  max-width: 100%;
  display: grid;
  place-items: center;
  gap: 8px;
}
.target-label {
  font-weight: 1000;
  letter-spacing: 0.2px;
  color: #ffffff;
  text-shadow: 0 1px 0 rgba(68, 61, 61, 0.7);
}
.target-card-shell {
  display: grid;
  place-items: center;
}
.target-card {
  width: 170px;
  height: 230px;
  border-radius: 12px;
  border: 2px solid var(--accent-primary);
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(2, 6, 23, 0.08);
  padding: 10px;
  box-sizing: border-box;
  display: grid;
  align-content: center;
  gap: 10px;
}

/* --- Controls --- */
.controls {
  margin: 8px auto 10px;
  max-width: 860px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

/* --- Stage --- */
.stage-wrap {
  margin: 6px auto 0;
  max-width: 1500px;
}
.stage {
  position: relative;
  width: 100%;
  height: min(74vh, 760px);
  background: transparent;
  border: none;
  box-shadow: none;
  overflow: visible;
}
.stage.busy {
  cursor: progress;
}

/* --- Cards --- */
.card {
  position: absolute;
  width: 170px;
  height: 230px;
  transform: translate(-50%, -50%);
  perspective: 1000px;
  cursor: default;
  user-select: none;

  transition: left 260ms cubic-bezier(0.2, 0.7, 0.2, 1), top 260ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.stage.easy .card {
  transition: left 520ms cubic-bezier(0.2, 0.7, 0.2, 1), top 520ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.stage.impossible .card {
  transition: left 140ms cubic-bezier(0.2, 0.7, 0.2, 1), top 140ms cubic-bezier(0.2, 0.7, 0.2, 1);
}

.card.can-click {
  cursor: pointer;
}
.card.can-click:hover {
  transform: translate(-50%, -50%) scale(1.03);
}

/* Flip */
.card-inner {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  position: relative;
  transition: transform 540ms cubic-bezier(0.2, 0.6, 0.2, 1);
  border-radius: 12px;
  box-sizing: border-box;
}
.card.revealed .card-inner {
  transform: rotateY(180deg);
}

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
  gap: 10px;
  border: 2px solid var(--accent-primary);
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(2, 6, 23, 0.08);
  overflow: hidden;
  padding: 10px;
  box-sizing: border-box;
}
.card-front {
  background: #ffffff;
}
.card-back {
  transform: rotateY(180deg);
  border-color: color-mix(in srgb, var(--accent-primary) 60%, #000 40%);
  background-image: var(--back-texture);
  background-repeat: repeat;
  background-size: 260px auto;
  background-position: center;
}

/* Shared media/text */
.card-media {
  width: 100%;
  height: 140px;
  display: grid;
  place-items: center;
}
.card-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.card-text {
  text-align: center;
  font-weight: 900;
  font-size: 16px;
  color: #0b1f1d;
  line-height: 1.12;
  word-break: break-word;
  padding: 0 6px;
}

.card.correct-hit .card-front {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-success) 55%, transparent);
}
.card.wrong-pick .card-front {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-danger) 55%, transparent);
}

@keyframes happyBounce {
  0% {
    transform: rotateY(0deg) scale(1);
  }
  25% {
    transform: rotateY(0deg) scale(1.06);
  }
  55% {
    transform: rotateY(0deg) scale(0.98);
  }
  100% {
    transform: rotateY(0deg) scale(1);
  }
}
.card.bounce .card-inner {
  animation: happyBounce 650ms ease-out both;
}

@media (max-width: 520px) {
  .shuffle-game-page {
    padding: 20px 14px 30px;
  }
  .card,
  .target-card {
    width: 150px;
    height: 210px;
  }
  .card-media {
    height: 124px;
  }
}

/* Empty */
.empty-state {
  margin: 18px auto 0;
  max-width: 760px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--modal-surface);
  border: 1px solid var(--modal-border);
  color: var(--modal-on-surface);
  text-align: center;
  font-weight: 800;
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .card-inner,
  .settings-drop-enter-active,
  .settings-drop-leave-active {
    transition: none !important;
    animation: none !important;
  }
}
</style>
