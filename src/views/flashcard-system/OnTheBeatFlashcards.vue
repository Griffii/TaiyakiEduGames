
<!-- src/views/flashcard-system/OnTheBeat.vue -->
<template>
  <section class="otb-page" :style="rootVars" aria-label="On The Beat">
    <!-- Background -->
    <div class="otb-bg" aria-hidden="true"></div>
    <div class="otb-bg-overlay" aria-hidden="true"></div>

    <!-- Back/Home (to DeckViewer) -->
    <button class="home-btn" type="button" @click="onExitToDeckViewer" aria-label="Back to deck">
      <img :src="homeIconUrl" alt="" />
    </button>

    <!-- Corner icons (instant flip left/right every beat) -->
    <img
      class="corner-icon tl corner-icon--mega"
      :class="{ 'is-beating': isBeating }"
      :src="cornerTL"
      alt=""
      aria-hidden="true"
    />
    <img class="corner-icon tr" :class="{ 'is-beating': isBeating }" :src="cornerTR" alt="" aria-hidden="true" />
    <img class="corner-icon bl" :class="{ 'is-beating': isBeating }" :src="cornerBL" alt="" aria-hidden="true" />
    <img class="corner-icon br" :class="{ 'is-beating': isBeating }" :src="cornerBR" alt="" aria-hidden="true" />

    <!-- MENU -->
    <section v-if="mode === 'menu'" class="menu" aria-label="On The Beat menu">
      <header class="menu-head">
        <!-- Beautified title -->
        <div class="title-stack" aria-label="Game title">
          <div class="title-main">Say the word</div>
          <div class="title-sub">on the beat!</div>
        </div>

        <p class="menu-subtitle">A flashcard rhythm game</p>
      </header>

      <div class="menu-grid">
        <!-- Words count -->
        <div class="menu-card">
          <div class="menu-card__title">Words</div>
          <div class="menu-card__row">
            <button
              v-for="n in [3, 4, 5, 6, 7, 8]"
              :key="n"
              class="sq-btn"
              type="button"
              :disabled="n > maxWordOption"
              :class="{
                'is-active': selectedWordCount === n,
                'is-disabled': n > maxWordOption
              }"
              @click="selectWordCount(n)"
            >
              {{ n }}
            </button>
          </div>
        </div>

        <!-- Speed -->
        <div class="menu-card">
          <div class="menu-card__title">Speed</div>
          <div class="menu-card__row">
            <button class="sq-btn" type="button" :class="{ 'is-active': speed === 'slow' }" @click="speed = 'slow'">
              Slow
            </button>
            <button
              class="sq-btn"
              type="button"
              :class="{ 'is-active': speed === 'normal' }"
              @click="speed = 'normal'"
            >
              Normal
            </button>
            <button class="sq-btn" type="button" :class="{ 'is-active': speed === 'fast' }" @click="speed = 'fast'">
              Fast
            </button>
            <button
              class="sq-btn"
              type="button"
              :class="{ 'is-active': speed === 'speedingUp' }"
              @click="speed = 'speedingUp'"
              title="Each round gets faster"
            >
              Speeding Up
            </button>
          </div>
        </div>

        <!-- Text toggles -->
        <div class="menu-card">
          <div class="menu-card__title">Card Text</div>
          <div class="menu-card__row">
            <button
              class="sq-btn"
              type="button"
              :class="{ 'is-active': showEnglish }"
              @click="showEnglish = !showEnglish"
            >
              English
            </button>
            <button
              class="sq-btn"
              type="button"
              :class="{ 'is-active': showJapanese }"
              @click="showJapanese = !showJapanese"
            >
              Japanese
            </button>
          </div>
        </div>

        <!-- Start -->
        <div class="menu-card menu-card--start">
          <button class="sq-btn sq-btn--primary" type="button" :disabled="!canStart" @click="startGame">
            Start
          </button>
          <div v-if="!canStart" class="menu-warn">This deck has fewer than 3 cards. Add more cards to play.</div>
        </div>
      </div>
    </section>

    <!-- GAME -->
    <section v-else class="game" aria-label="On The Beat game">
      <!-- Round counter: top-center -->
      <header class="hud" aria-label="Game HUD">
        <div class="hud-center">
          <div class="hud-pill hud-pill--round">Round {{ roundIndex + 1 }}</div>
        </div>

        <div class="hud-right">
          <button class="sq-btn" type="button" @click="stopGameAndReturnToMenu">Stop</button>
        </div>
      </header>

      <div class="board" aria-label="Card board">
        <!-- Finish button appears where the cards used to be (no modal) -->
        <div v-if="showFinishButton" class="finish-center" aria-label="Finish">
          <button class="sq-btn sq-btn--primary" type="button" @click="returnToMenuFromFinish">Finish</button>
        </div>

        <div v-else class="card-grid" role="grid" aria-label="8 cards">
          <article
            v-for="(c, i) in visibleCards"
            :key="c._slotKey"
            class="beat-card"
            role="gridcell"
            :class="[
              // Intro 8 beats (before Round 1 starts): keep cards hidden
              isIntro8 ? 'deal-hidden' : '',

              // Round 1 counts 1–8: deal in one-by-one (second 8 count of the song is NOT round 1)
              isRound1Deal && i < dealCount ? 'deal-in' : '',
              isRound1Deal && i >= dealCount ? 'deal-hidden' : '',

              // Explosion end
              isExploding ? 'explode-out' : '',

              // Highlight: counts 9–16 each round
              highlightedIndex === i ? 'is-highlighted' : ''
            ]"
            :style="isExploding ? explodeStyle(i) : undefined"
          >
            <div class="beat-card__inner">
              <div v-if="showJapanese" class="beat-card__jp">
                {{ jpKanji(c) }}
              </div>

              <div class="beat-card__img-wrap">
                <img v-if="c.image_url" class="beat-card__img" :src="c.image_url" alt="" decoding="async" />
              </div>

              <div class="beat-card__text">
                <div v-if="showEnglish" class="beat-card__en">
                  {{ c.english ?? '' }}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- LOADING / COUNTDOWN overlays only -->
      <div v-if="phase === 'loading'" class="overlay overlay--loading" role="status" aria-live="polite">
        <div class="overlay-card">
          <div class="overlay-title">Loading…</div>
          <div class="overlay-sub">Preparing images and audio.</div>
          <div class="overlay-progress">
            <div class="bar">
              <div class="bar__fill" :style="{ width: `${Math.round(loadProgress * 100)}%` }"></div>
            </div>
            <div class="pct">{{ Math.round(loadProgress * 100) }}%</div>
          </div>
        </div>
      </div>

      <!-- Countdown finishes within the intro 8 count (audio already playing) -->
      <div v-else-if="phase === 'countdown'" class="overlay overlay--countdown" role="status" aria-live="polite">
        <div class="countdown-card">
          <div class="countdown-num">{{ countdownNumber }}</div>
          <div class="countdown-sub">Get ready</div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameTransitStore, type Flashcard as TransitCard } from '@/stores/gameTransit'

import bgUrl from '@/assets/images/games/on-the-beat/crumpled-paper-01.png'
import iconMegaphone from '@/assets/images/games/on-the-beat/megaphone.png'
import iconLightning from '@/assets/images/games/on-the-beat/lightning.png'
import iconExclamation from '@/assets/images/games/on-the-beat/exclamation.png'
import iconLightbulb from '@/assets/images/games/on-the-beat/lightbulb.png'
import homeIconUrl from '@/assets/images/icons/home-icon.png'
import songUrl from '@/assets/sounds/music/on-the-beat.mp3'

/** ===== Root vars for background ===== */
const rootVars = computed(() => ({
  '--otb-bg-url': `url("${bgUrl}")`,
}))

/** ===== Corner icon sources ===== */
const cornerTL = iconMegaphone
const cornerTR = iconLightning
const cornerBL = iconExclamation
const cornerBR = iconLightbulb

/** ===== Transit/session hydration ===== */
const TRANSIT_KEY = 'eitake.onthebeat.transit.v1'

/** ===== Router / Store ===== */
const router = useRouter()
const transit = useGameTransitStore()

/** ===== Optional props ===== */
const props = withDefaults(
  defineProps<{
    cards?: TransitCard[]
  }>(),
  {}
)

/** ===== Source cards ===== */
const sourceCards = computed<TransitCard[]>(() => (props.cards?.length ? props.cards : transit.cards))

/** ===== Menu state ===== */
const mode = ref<'menu' | 'game'>('menu')
const selectedWordCount = ref<number>(8)
const speed = ref<'normal' | 'slow' | 'fast' | 'speedingUp'>('normal')
const showEnglish = ref<boolean>(true)
const showJapanese = ref<boolean>(false)

/** ===== Playback rates (no extra tracks) ===== */
const SPEED_RATE: Record<'slow' | 'normal' | 'fast', number> = {
  slow: 0.92,
  normal: 1.0,
  fast: 1.08,
}

/**
 * Speeding Up profile:
 * - Round 1 starts slightly slower than normal
 * - Each new round increases modestly
 * Keep the range conservative to avoid chipmunk artifacts.
 */
const SPEEDING_UP_START = 0.96
const SPEEDING_UP_STEP = 0.03 // per round boundary (0->1->2->3->4)
const SPEEDING_UP_MAX = 1.12

const roundPlaybackRate = computed(() => {
  if (speed.value !== 'speedingUp') return 1.0
  const r = clamp(roundIndex.value, 0, 4)
  return clamp(SPEEDING_UP_START + r * SPEEDING_UP_STEP, 0.75, SPEEDING_UP_MAX)
})

const playbackRate = computed(() => {
  if (speed.value === 'speedingUp') return roundPlaybackRate.value
  return SPEED_RATE[speed.value] ?? 1.0
})

/** ===== Deck cards ===== */
const allCards = ref<TransitCard[]>([])
const canStart = computed(() => allCards.value.length >= 3)
const availableCardCount = computed(() => allCards.value.length)

// Max option is capped at 8, but also can’t exceed available cards
const maxWordOption = computed(() => Math.min(8, availableCardCount.value))

function selectWordCount(n: number) {
  if (n > maxWordOption.value) return
  selectedWordCount.value = n
}

// Keep selection valid whenever deck size changes
watch(
  availableCardCount,
  (count) => {
    if (count >= 3) {
      const clamped = Math.min(Math.max(selectedWordCount.value, 3), maxWordOption.value)
      if (clamped !== selectedWordCount.value) selectedWordCount.value = clamped
    } else {
      selectedWordCount.value = 3
    }
  },
  { immediate: true }
)

/** ===== Game phases ===== */
type Phase = 'idle' | 'loading' | 'countdown' | 'playing' | 'finished'
const phase = ref<Phase>('idle')
const loadProgress = ref<number>(0)
const countdownNumber = ref<number>(3)

/** ===== Timing model ===== */
const INTRO_BEATS = 8
const ROUNDS = 5
const beatsPerRound = 16
const DEFAULT_SONG_DURATION_SEC = 30
const BEAT_SPEED_MULT = 0.88

// Positive values delay the beat counter slightly (visuals start later)
const BEAT_START_DELAY_MS = 90

const songDurationSec = ref<number>(DEFAULT_SONG_DURATION_SEC)

/**
 * Base beat interval from song duration, then adjusted by playbackRate.
 * Faster audio => smaller beat interval; slower audio => larger interval.
 *
 * NOTE: For Speeding Up, playbackRate changes each round. We handle that in the scheduler
 * by using a dynamic interval function rather than freezing it at start.
 */
function computeBeatIntervalMs(rate: number) {
  const roundDurationMs = Math.round((songDurationSec.value * 1000) / ROUNDS)
  const base = Math.max(80, Math.round((roundDurationMs / beatsPerRound) * BEAT_SPEED_MULT))
  return Math.max(40, Math.round(base / rate))
}

/** ===== Game state ===== */
const roundIndex = ref<number>(0) // 0..4 (Round 1 == 0)
const beatInRound = ref<number>(0) // 0..15 (for debug)
const highlightedIndex = ref<number>(-1)
const visibleCards = ref<(TransitCard & { _slotKey: string })[]>([])
const dealCount = ref<number>(0)

const isBeating = ref<boolean>(false)

/** Intro / deal staging */
const isIntro8 = ref<boolean>(true) // song beats 0..7
const isRound1Deal = ref<boolean>(false) // round 1 beats 0..7 (counts 1..8)

const isExploding = ref<boolean>(false)
const showFinishButton = ref<boolean>(false)
const EXPLODE_MS = 520

function explodeStyle(i: number) {
  const angle = (Math.PI * 2 * i) / 8
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const magX = 130
  const magY = 120
  const rot = (i % 2 === 0 ? 1 : -1) * (18 + i * 2)
  const scale = 1.03

  return {
    '--dx': `${(dx * magX).toFixed(1)}vw`,
    '--dy': `${(dy * magY).toFixed(1)}vh`,
    '--rot': `${rot}deg`,
    '--sc': `${scale}`,
    animationDuration: `${EXPLODE_MS}ms`,
  } as Record<string, string>
}

/** WebAudio */
let ac: AudioContext | null = null
let audioBuffer: AudioBuffer | null = null
let bufferSource: AudioBufferSourceNode | null = null
let gainNode: GainNode | null = null

let audioStartPerf = 0
let audioEndTimer: number | null = null

/** timers */
let beatTimeout: number | null = null
let hardStopTimer: number | null = null

function onExitToDeckViewer() {
  try {
    router.back()
  } catch {
    /* ignore */
  }
}

/** ===== Helpers ===== */
function shuffleInPlace<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickUniqueCards(source: TransitCard[], count: number): TransitCard[] {
  const copy = shuffleInPlace([...source])
  return copy.slice(0, Math.min(count, copy.length))
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function jpKanji(card: TransitCard): string {
  return card?.japanese?.kanji ?? ''
}

/** ===== Preloading ===== */
function preloadImagePromise(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url) return resolve()
    const img = new Image()
    img.decoding = 'async'
    img.loading = 'eager'
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

async function ensureAudioContext(): Promise<AudioContext> {
  if (ac) return ac
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  ac = new Ctx()
  return ac
}

async function loadSongBuffer(url: string): Promise<AudioBuffer> {
  const ctx = await ensureAudioContext()
  const res = await fetch(url, { cache: 'force-cache' })
  const arr = await res.arrayBuffer()
  return await ctx.decodeAudioData(arr)
}

/** ===== Session persistence ===== */
function persistSession() {
  try {
    const payload = { cards: allCards.value }
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

/** ===== Round word mixing ===== */
function getRoundWordPool(baseWords: TransitCard[], r: number): TransitCard[] {
  if (r >= 4) return baseWords
  const n = baseWords.length
  const start = (r * 2) % n
  const a = baseWords[start]
  const b = baseWords[(start + 1) % n]
  return [a, b].filter(Boolean) as TransitCard[]
}

function build8SlotsFromPool(pool: TransitCard[]): (TransitCard & { _slotKey: string })[] {
  const out: (TransitCard & { _slotKey: string })[] = []
  for (let i = 0; i < 8; i++) {
    const picked = pool[Math.floor(Math.random() * pool.length)]
    out.push({
      ...picked,
      _slotKey: `${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`,
    })
  }
  return out
}

function applyRoundCards(baseWords: TransitCard[], r: number) {
  const pool = getRoundWordPool(baseWords, r)
  visibleCards.value = build8SlotsFromPool(pool)
  visibleCards.value.forEach((c) => void preloadImagePromise(c.image_url))
}

function updateHighlightForBeatInRound(b: number) {
  // highlight on counts 9–16 => b 8..15
  if (b < 8) {
    highlightedIndex.value = -1
    return
  }
  const idx = b - 8
  highlightedIndex.value = idx >= 0 && idx < 8 ? idx : -1
}

/** ===== lifecycle / stop ===== */
function clearTimers() {
  if (beatTimeout != null) {
    window.clearTimeout(beatTimeout)
    beatTimeout = null
  }
  if (hardStopTimer != null) {
    window.clearTimeout(hardStopTimer)
    hardStopTimer = null
  }
  if (audioEndTimer != null) {
    window.clearTimeout(audioEndTimer)
    audioEndTimer = null
  }
}

function resetGameState() {
  roundIndex.value = 0
  beatInRound.value = 0
  highlightedIndex.value = -1
  dealCount.value = 0
  isBeating.value = false

  isIntro8.value = true
  isRound1Deal.value = false

  isExploding.value = false
  showFinishButton.value = false
}

function stopWebAudio() {
  try {
    if (bufferSource) bufferSource.stop()
  } catch {
    /* ignore */
  }
  bufferSource = null
  gainNode = null
  audioStartPerf = 0
}

function stopGameAndReturnToMenu() {
  clearTimers()
  stopWebAudio()
  resetGameState()
  visibleCards.value = []
  phase.value = 'idle'
  mode.value = 'menu'
}

function returnToMenuFromFinish() {
  clearTimers()
  stopWebAudio()
  resetGameState()
  visibleCards.value = []
  phase.value = 'idle'
  mode.value = 'menu'
}

function triggerExplodeAndFinish() {
  if (isExploding.value || showFinishButton.value) return

  phase.value = 'finished'
  highlightedIndex.value = -1
  isBeating.value = false

  isExploding.value = true

  window.setTimeout(() => {
    isExploding.value = false
    visibleCards.value = []
    showFinishButton.value = true
  }, EXPLODE_MS + 40)
}

function onAudioEnded() {
  clearTimers()
  triggerExplodeAndFinish()
}

/**
 * Beat scheduler
 *
 * We anchor beats to audioStartPerf (audible output time), and compute the beat index
 * from a piecewise timeline that supports:
 * - Constant speed modes (slow/normal/fast)
 * - Speeding Up mode where each round (16 beats) runs at a different rate
 */
function startBeatScheduler(baseWords: TransitCard[]) {
  const totalSongBeats = INTRO_BEATS + ROUNDS * beatsPerRound

  // Precompute beat interval segments (intro + 5 rounds), with optional per-round speed changes.
  // Segment beats:
  //  - segment 0: intro 8 beats
  //  - segment 1..5: rounds 1..5 (each 16 beats)
  type Segment = { beats: number; intervalMs: number; startBeat: number; startTimeMs: number; rate: number }
  const segments: Segment[] = []

  const introRate = speed.value === 'speedingUp' ? SPEEDING_UP_START : playbackRate.value
  const introInterval = computeBeatIntervalMs(introRate)

  segments.push({ beats: INTRO_BEATS, intervalMs: introInterval, startBeat: 0, startTimeMs: 0, rate: introRate })

  let cursorBeat = INTRO_BEATS
  let cursorTime = INTRO_BEATS * introInterval

  for (let r = 0; r < ROUNDS; r++) {
    const rate =
      speed.value === 'speedingUp'
        ? clamp(SPEEDING_UP_START + r * SPEEDING_UP_STEP, 0.75, SPEEDING_UP_MAX)
        : playbackRate.value

    const interval = computeBeatIntervalMs(rate)
    segments.push({
      beats: beatsPerRound,
      intervalMs: interval,
      startBeat: cursorBeat,
      startTimeMs: cursorTime,
      rate,
    })

    cursorBeat += beatsPerRound
    cursorTime += beatsPerRound * interval
  }

  // Total effective runtime (for fallback hard-stop accuracy)
  const totalEffectiveMs = cursorTime

  function findSongBeat(elapsedMs: number) {
    if (elapsedMs <= 0) return 0
    for (let s = 0; s < segments.length; s++) {
      const seg = segments[s]
      const segEndTime = seg.startTimeMs + seg.beats * seg.intervalMs
      if (elapsedMs < segEndTime) {
        const within = Math.floor((elapsedMs - seg.startTimeMs) / seg.intervalMs)
        return clamp(seg.startBeat + within, seg.startBeat, seg.startBeat + seg.beats - 1)
      }
    }
    return totalSongBeats
  }

  function currentSegmentForBeat(songBeat: number) {
    for (let s = segments.length - 1; s >= 0; s--) {
      const seg = segments[s]
      if (songBeat >= seg.startBeat) return seg
    }
    return segments[0]
  }

  const tick = () => {
    if (phase.value !== 'countdown' && phase.value !== 'playing') return

    const elapsedMs = performance.now() - audioStartPerf
    const songBeat = findSongBeat(elapsedMs)

    if (songBeat >= totalSongBeats) {
      triggerExplodeAndFinish()
      return
    }

    // Corner icons: instant flip each beat
    isBeating.value = (songBeat % 2) === 1

    // INTRO beats (0..7): countdown, no round counting
    if (songBeat < INTRO_BEATS) {
      isIntro8.value = true
      isRound1Deal.value = false
      dealCount.value = 0
      highlightedIndex.value = -1

      if (songBeat < 2) countdownNumber.value = 3
      else if (songBeat < 4) countdownNumber.value = 2
      else if (songBeat < 6) countdownNumber.value = 1
      else {
        countdownNumber.value = 0
        phase.value = 'playing'
      }

      beatInRound.value = 0
      return scheduleNext(songBeat + 1)
    }

    // ROUNDS: start counting AFTER intro 8 beats
    isIntro8.value = false
    phase.value = 'playing'

    const roundBeat = songBeat - INTRO_BEATS // 0..79
    const r = Math.floor(roundBeat / beatsPerRound) // 0..4
    const b = roundBeat % beatsPerRound // 0..15

    roundIndex.value = clamp(r, 0, ROUNDS - 1)
    beatInRound.value = b

    // If this is Speeding Up mode, keep audio playback rate aligned with the round rate.
    if (speed.value === 'speedingUp' && bufferSource) {
      const desired = clamp(SPEEDING_UP_START + roundIndex.value * SPEEDING_UP_STEP, 0.75, SPEEDING_UP_MAX)
      // Only update if changed enough to matter (reduces parameter churn).
      if (Math.abs(bufferSource.playbackRate.value - desired) > 0.001) {
        bufferSource.playbackRate.value = desired
      }
    }

    // New round boundary
    if (b === 0) {
      applyRoundCards(baseWords, roundIndex.value)
      highlightedIndex.value = -1
      dealCount.value = 0
    }

    // Round 1: deal in on counts 1–8 (b 0..7)
    if (roundIndex.value === 0 && b < 8) {
      isRound1Deal.value = true
      dealCount.value = b + 1
      highlightedIndex.value = -1
    } else {
      isRound1Deal.value = false
      dealCount.value = 8
      updateHighlightForBeatInRound(b)
    }

    return scheduleNext(songBeat + 1)
  }

  function scheduleNext(nextSongBeat: number) {
    // Determine when the next beat should occur based on segments.
    const seg = currentSegmentForBeat(nextSongBeat)
    const beatOffsetInSeg = nextSongBeat - seg.startBeat
    const nextElapsedAt = seg.startTimeMs + beatOffsetInSeg * seg.intervalMs
    const nextAtPerf = audioStartPerf + nextElapsedAt
    const delay = Math.max(0, nextAtPerf - performance.now())
    beatTimeout = window.setTimeout(tick, delay)
  }

  // Prepare visuals
  applyRoundCards(baseWords, 0)
  dealCount.value = 0
  highlightedIndex.value = -1
  isIntro8.value = true
  isRound1Deal.value = false

  tick()

  // Return total effective runtime for fallback hard-stop usage
  return totalEffectiveMs
}

/** ===== Start ===== */
async function startGame() {
  if (!canStart.value) return

  phase.value = 'loading'
  mode.value = 'game'
  resetGameState()

  const n = clamp(selectedWordCount.value, 3, 8)
  const baseWords = pickUniqueCards(allCards.value, n)

  // deterministic preloads
  const round1Pool = getRoundWordPool(baseWords, 0)
  const round1Slots = build8SlotsFromPool(round1Pool)

  const imgUrls = [
    bgUrl,
    cornerTL,
    cornerTR,
    cornerBL,
    cornerBR,
    homeIconUrl,
    ...allCards.value.map((c) => c.image_url),
    ...round1Slots.map((c) => c.image_url),
  ].filter(Boolean)

  const uniqueImgs = Array.from(new Set(imgUrls))
  const totalSteps = uniqueImgs.length + 1
  let doneSteps = 0
  const bump = () => {
    doneSteps += 1
    loadProgress.value = Math.min(1, doneSteps / totalSteps)
  }

  await Promise.all(
    uniqueImgs.map(async (u) => {
      await preloadImagePromise(u)
      bump()
    })
  )

  try {
    audioBuffer = await loadSongBuffer(songUrl)
  } catch {
    audioBuffer = null
  }
  bump()

  if (audioBuffer?.duration && Number.isFinite(audioBuffer.duration) && audioBuffer.duration > 1) {
    songDurationSec.value = audioBuffer.duration
  } else {
    songDurationSec.value = DEFAULT_SONG_DURATION_SEC
  }

  // show countdown overlay; audio starts underneath it
  phase.value = 'countdown'
  countdownNumber.value = 3

  const ctx = await ensureAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {})
  }

  stopWebAudio()

  // Decide initial rate for audio start
  const initialRate =
    speed.value === 'speedingUp' ? clamp(SPEEDING_UP_START, 0.75, SPEEDING_UP_MAX) : (SPEED_RATE[speed.value] ?? 1.0)

  // fallback visuals-only (still respects effective timing)
  if (!audioBuffer) {
    const fallbackLead = 90
    audioStartPerf = performance.now() + fallbackLead + BEAT_START_DELAY_MS

    const totalEffectiveMs = startBeatScheduler(baseWords) ?? Math.round(songDurationSec.value * 1000)

    hardStopTimer = window.setTimeout(() => triggerExplodeAndFinish(), Math.round(totalEffectiveMs) + 900)
    return
  }

  bufferSource = ctx.createBufferSource()
  bufferSource.buffer = audioBuffer

  // ✅ Set initial rate (may increase per round in scheduler)
  bufferSource.playbackRate.value = initialRate

  gainNode = ctx.createGain()
  gainNode.gain.value = 1
  bufferSource.connect(gainNode)
  gainNode.connect(ctx.destination)

  const leadMs = 120
  const latencySec = (ctx.baseLatency ?? 0) + (ctx.outputLatency ?? 0)
  const latencyMs = Math.max(0, Math.round(latencySec * 1000))

  const startCtxTime = ctx.currentTime + leadMs / 1000
  bufferSource.start(startCtxTime)

  // ✅ Anchor beats to audible output, plus a small intentional delay
  audioStartPerf = performance.now() + leadMs + latencyMs + BEAT_START_DELAY_MS

  // Use scheduler-derived effective runtime (piecewise) so hard-stop stays aligned, including Speeding Up.
  const totalEffectiveMs = startBeatScheduler(baseWords) ?? Math.round(songDurationSec.value * 1000)

  bufferSource.onended = () => onAudioEnded()
  audioEndTimer = window.setTimeout(() => onAudioEnded(), Math.round(totalEffectiveMs) + leadMs + latencyMs + 180)

  hardStopTimer = window.setTimeout(() => {
    if (phase.value === 'countdown' || phase.value === 'playing') triggerExplodeAndFinish()
  }, Math.round(totalEffectiveMs) + leadMs + latencyMs + 1200)
}

/** ===== Lifecycle ===== */
onMounted(() => {
  if (!sourceCards.value.length) hydrateFromSession()
  allCards.value = [...(sourceCards.value.length ? sourceCards.value : transit.cards)]
  persistSession()

  // Default word count: 8 if possible, otherwise the max available (>=3)
  if (allCards.value.length >= 3) {
    selectedWordCount.value = Math.min(8, allCards.value.length)
  } else {
    selectedWordCount.value = 3
  }

  void preloadImagePromise(bgUrl)
  void preloadImagePromise(cornerTL)
  void preloadImagePromise(cornerTR)
  void preloadImagePromise(cornerBL)
  void preloadImagePromise(cornerBR)
  void preloadImagePromise(homeIconUrl)
})

onBeforeUnmount(() => {
  clearTimers()
  stopWebAudio()
})
</script>

<style scoped>
/* ============================================================================
   PAGE + BACKGROUND
   ============================================================================ */
.otb-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  color: #141414;
}

.game,
.menu {
  position: relative;
  z-index: 3;
}

.otb-bg {
  position: absolute;
  inset: 0;
  background-image: var(--otb-bg-url);
  background-size: cover;
  background-position: center;
  filter: saturate(1.02) contrast(1.02);
  z-index: 0;
}

.otb-bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.58);
  z-index: 1;
}

/* ============================================================================
   HOME BUTTON
   ============================================================================ */
.home-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 9;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.home-btn img {
  width: 44px;
  height: 44px;
  display: block;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.28));
}

/* ============================================================================
   CORNER ICONS (instant 15° flip; megaphone larger)
   ============================================================================ */
.corner-icon {
  position: absolute;
  width: 88px;
  height: 88px;
  z-index: 4;
  opacity: 0.95;
  filter: drop-shadow(0 6px 0 rgba(0, 0, 0, 0.20));
  transform-origin: center;
  pointer-events: none;
  transform: rotate(-15deg);
}

.corner-icon--mega {
  width: 108px;
  height: 108px;
}

.corner-icon.tl {
  top: 72px;
  left: 80px;
}

.corner-icon.tr {
  top: 72px;
  right: 72px;
}

.corner-icon.bl {
  bottom: 72px;
  left: 72px;
}

.corner-icon.br {
  bottom: 72px;
  right: 72px;
}

.corner-icon.is-beating {
  transform: rotate(15deg);
}

/* ============================================================================
   MENU (more spacing below title; sub box moved further down/right)
   ============================================================================ */
.menu {
  width: min(980px, calc(100% - 32px));
  margin: 0 auto;
  height: 100%;
  padding: 60px 16px 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.menu-head {
  text-align: center;
  margin-bottom: 28px;
  display: grid;
  justify-items: center;
  gap: 16px;
}

.title-stack {
  position: relative;
  display: inline-block;
  padding: 6px;
  margin-bottom: 35px;
}

.title-main {
  display: inline-block;
  padding: 14px 22px;
  background: rgb(107, 188, 245);
  border: 2px solid rgba(0, 0, 0, 0.22);
  box-shadow: 6px 10px 0 rgba(0, 0, 0, 0.92);
  color: #ffffff;
  font-weight: 1000;
  letter-spacing: 0.02em;
  font-size: clamp(2.2rem, 3.5vw, 3rem);
  line-height: 1.05;
  text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.92);
}

.title-sub {
  position: absolute;
  right: -60px;
  bottom: -36px;
  padding: 10px 14px;
  background: rgb(185, 255, 205);
  border: 2px solid rgba(0, 0, 0, 0.92);
  box-shadow: 6px 10px 0 rgba(0, 0, 0, 0.92);
  font-weight: 1000;
  letter-spacing: 0.02em;
  font-size: clamp(1.25rem, 2.2vw, 1.6rem);
  line-height: 1.05;
  transform-origin: 60% 60%;
  animation: subFlip 1s steps(1, end) infinite;
}

@keyframes subFlip {
  0% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
  100% {
    transform: rotate(-3deg);
  }
}

.menu-subtitle {
  margin: 0;
  font-size: 1.02rem;
  font-family: 'Comic Sans MS', 'Comic Sans', cursive;
  opacity: 0.82;
}

.menu-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

@media (min-width: 820px) {
  .menu-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.menu-card {
  background: rgba(255, 255, 255, 0.7);
  border: 2px solid rgba(0, 0, 0, 0.08);

  /* moved slightly right */
  box-shadow: 4px 10px 0 rgba(0, 0, 0, 0.14);

  padding: 14px 14px 12px;
}

.menu-card--start {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.menu-card__title {
  font-weight: 800;
  margin-bottom: 10px;
  letter-spacing: 0.02em;
}

.menu-card__row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.menu-warn {
  font-size: 0.92rem;
  color: #6a1b1b;
}

/* ============================================================================
   BUTTONS (active = light green) — offset shadow right; tilt hover
   ============================================================================ */
.sq-btn {
  appearance: none;
  border: 2px solid rgba(0, 0, 0, 0.62);
  background: rgba(255, 255, 255, 0.92);
  color: #141414;

  padding: 10px 12px;
  min-width: 56px;
  height: 44px;
  border-radius: 0;

  box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.92);

  cursor: pointer;
  user-select: none;

  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;

  font-weight: 900;
  letter-spacing: 0.01em;

  transition:
    transform 70ms ease,
    box-shadow 70ms ease,
    background 140ms ease,
    border-color 140ms ease,
    opacity 140ms ease;
}

.sq-btn.is-disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.sq-btn:hover {
  transform: translateY(-2px) rotate(-1.2deg);
  box-shadow: 5px 7px 0 rgba(0, 0, 0, 0.92);
  border-color: rgba(0, 0, 0, 0.72);
}

.sq-btn:active {
  transform: translateY(4px) rotate(0deg);
  box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.92);
}

.sq-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: 6px 8px 0 rgba(0, 0, 0, 0.35);
}

.sq-btn.is-active {
  background: rgba(185, 255, 205, 0.96);
  border-color: rgba(0, 0, 0, 0.74);
}

/* ============================================================================
   GAME LAYOUT
   ============================================================================ */
.game {
  width: 100%;
  height: 100%;
  padding: 64px 16px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.hud {
  width: min(1180px, calc(100% - 32px));
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 0;
  margin-bottom: 16px;
}

.hud-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  display: flex;
  justify-content: center;
  width: max-content;
}

.hud-right {
  display: flex;
  justify-content: flex-end;
}

.hud-debug {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0.8;
}

.hud-pill--debug {
  display: block;
}

.hud-pill {
  background: rgba(255, 255, 255, 0.7);
  border: 2px solid rgba(0, 0, 0, 0.30);
  box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.22);
  border-radius: 0;
  padding: 12px 18px;
  font-weight: 1000;
  letter-spacing: 0.01em;
  font-size: 1.25rem;
}

.hud-pill--round {
  min-width: 220px;
  text-align: center;
}

.board {
  width: min(1180px, calc(100% - 32px));
  flex: 1;
  display: grid;
  place-items: center;
  padding-bottom: 10px;
  position: relative;
}

/* ============================================================================
   FINISH BUTTON — BIG, CENTERED, UNMISSABLE
   ============================================================================ */
.finish-center .sq-btn {
  width: min(520px, 90vw);
  height: 96px;

  font-size: 2.2rem;
  font-weight: 1000;
  letter-spacing: 0.04em;

  padding: 20px 28px;

  border-width: 3px;
  box-shadow: 8px 12px 0 rgba(0, 0, 0, 0.92);
}

.card-grid {
  width: 100%;
  max-width: 1100px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(2, auto);
  gap: 18px;
}

.beat-card {
  background: rgba(255, 255, 255, 0.90);
  border: 2px solid rgba(0, 0, 0, 0.18);
  border-radius: 0;

  /* moved slightly right */
  box-shadow: 4px 12px 0 rgba(0, 0, 0, 0.18);

  overflow: hidden;
  transform: translateZ(0);
  min-height: 240px;
  will-change: transform, opacity;
}

.beat-card__inner {
  width: 100%;
  height: 100%;
  padding: 14px 14px 12px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
}

.beat-card__jp {
  font-weight: 1000;
  font-size: 1.35rem;
  letter-spacing: 0.01em;
  text-align: center;
  line-height: 1.05;
  padding-top: 2px;
  min-height: 1.2em;
}

.beat-card__img-wrap {
  width: 100%;
  display: grid;
  place-items: center;
}

.beat-card__img {
  max-width: 100%;
  max-height: 140px;
  width: auto;
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.18));
}

.beat-card__text {
  width: 100%;
  display: grid;
  place-items: center;
  text-align: center;
  min-height: 1.8em;
}

.beat-card__en {
  font-weight: 1000;
  font-size: 1.25rem;
  line-height: 1.12;
  word-break: break-word;
  padding: 0 2px;
}

.beat-card.is-highlighted {
  outline: 5px solid rgba(0, 0, 0, 0.78);
  outline-offset: -5px;
  transform: translateY(-2px);

  /* keep highlight shadow consistent with right-shift */
  box-shadow: 4px 14px 0 rgba(0, 0, 0, 0.22);
}

.beat-card.deal-in {
  opacity: 0;
  transform: translateY(14px);
  animation: dealIn 240ms ease-out forwards;
}

.beat-card.deal-hidden {
  opacity: 0;
  transform: translateY(14px);
  pointer-events: none;
}

@keyframes dealIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.beat-card.explode-out {
  animation-name: explodeOut;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
}

@keyframes explodeOut {
  to {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(var(--sc));
  }
}

/* ============================================================================
   OVERLAYS (cover everything, including corner icons)
   ============================================================================ */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
}

.overlay--loading {
  background: rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(3px) saturate(110%);
  -webkit-backdrop-filter: blur(3px) saturate(110%);
}

.overlay--countdown {
  background: rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(2px) saturate(110%);
  -webkit-backdrop-filter: blur(2px) saturate(110%);
}

.overlay-card {
  width: min(420px, calc(100% - 24px));
  background: rgba(255, 255, 255, 0.82);
  border: 2px solid rgba(0, 0, 0, 0.12);
  box-shadow: 4px 12px 0 rgba(0, 0, 0, 0.20); /* moved slightly right */
  border-radius: 0;
  padding: 18px 16px 16px;
  text-align: center;
}

.overlay-title {
  font-weight: 1000;
  font-size: 1.4rem;
  margin: 0 0 6px;
}

.overlay-sub {
  opacity: 0.85;
  margin: 0 0 12px;
  font-weight: 800;
}

.overlay-progress {
  display: grid;
  gap: 8px;
  justify-items: center;
}

.bar {
  width: 100%;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.22);
  background: rgba(255, 255, 255, 0.65);
  box-shadow: inset 0 2px 0 rgba(0, 0, 0, 0.08);
}

.bar__fill {
  height: 100%;
  background: rgba(0, 0, 0, 0.72);
  width: 0%;
  transition: width 140ms ease;
}

.pct {
  font-weight: 950;
}

.countdown-card {
  width: min(360px, calc(100% - 24px));
  text-align: center;
}

.countdown-num {
  font-weight: 1000;
  font-size: 6rem;
  line-height: 1;
  color: #fff;
  text-shadow: 0 6px 0 rgba(0, 0, 0, 0.35);
}

.countdown-sub {
  margin-top: 8px;
  font-weight: 950;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.92);
}

/* ============================================================================
   RESPONSIVE
   ============================================================================ */
@media (max-width: 920px) {
  .corner-icon {
    width: 76px;
    height: 76px;
  }

  .corner-icon--mega {
    width: 96px;
    height: 96px;
  }

  .card-grid {
    gap: 12px;
  }

  .beat-card {
    min-height: 210px;
  }

  .beat-card__img {
    max-height: 120px;
  }

  .beat-card__en {
    font-size: 1.12rem;
  }

  .beat-card__jp {
    font-size: 1.18rem;
  }
}

@media (max-width: 360px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(4, auto);
    gap: 8px;
  }
}
</style>

