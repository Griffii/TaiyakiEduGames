<!-- src/views/flashcard-system/OnTheBeatPronouns.vue -->
<template>
  <section class="otb-page" :style="rootVars" aria-label="On The Beat — Pronouns">
    <!-- Background -->
    <div class="otb-bg" aria-hidden="true"></div>
    <div class="otb-bg-overlay" aria-hidden="true"></div>

    <!-- Back/Home (to previous screen) -->
    <button class="home-btn" type="button" @click="onExitToDeckViewer" aria-label="Back">
      <img :src="homeIconUrl" alt="" />
    </button>

    <!-- Corner icons (instant flip left/right every beat) -->
    <img class="corner-icon tl corner-icon--mega" :class="{ 'is-beating': isBeating }" :src="cornerTL" alt=""
      aria-hidden="true" />
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

        <p class="menu-subtitle">A rhythm game (fixed sets)</p>
      </header>

      <div class="menu-grid">
        <!-- Set selection -->
        <div class="menu-card">
          <div class="menu-card__title">Set</div>
          <div class="menu-card__row">
            <button
              class="sq-btn"
              type="button"
              :class="{ 'is-active': selectedSetKey === 'pronouns' }"
              @click="selectSet('pronouns')"
            >
              Pronouns
            </button>
          </div>
        </div>

        <!-- Text toggles -->
        <div class="menu-card">
          <div class="menu-card__title">Card Text</div>
          <div class="menu-card__row">
            <button
              class="sq-btn is-active is-disabled"
              type="button"
              disabled
              title="English is required for this set"
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
            Play
          </button>
          <div v-if="!canStart" class="menu-warn">This set is unavailable.</div>
        </div>
      </div>
    </section>

    <!-- GAME -->
    <section v-else class="game" aria-label="On The Beat game">
      <!-- Round counter: top-center -->
      <header class="hud" aria-label="Game HUD">
        <div class="hud-center">
          <div class="hud-pill hud-pill--round">
            Round {{ overallRoundNumber }} / {{ totalRoundsOverall }}
          </div>
        </div>

        <!-- Debug (kept, but hidden by CSS) -->
        <div class="hud-debug" aria-hidden="true">
          <div class="hud-pill hud-pill--debug">
            Beat {{ beatInRound + 1 }} / 16
          </div>
        </div>

        <div class="hud-right">
          <button class="sq-btn" type="button" @click="stopGameAndReturnToMenu">Stop</button>
        </div>
      </header>

      <div class="board" aria-label="Card board">
        <!-- Continue/Finish buttons appear where the cards used to be -->
        <div v-if="showContinueButton || showFinishButton" class="finish-center" aria-label="Continue/Finish">
          <button
            v-if="showContinueButton"
            class="sq-btn sq-btn--primary"
            type="button"
            @click="continueToNextGame"
          >
            Continue
          </button>

          <button
            v-else
            class="sq-btn sq-btn--primary"
            type="button"
            @click="returnToMenuFromFinish"
          >
            Finish
          </button>
        </div>

        <div v-else class="card-grid" role="grid" aria-label="8 cards">
          <article
            v-for="(c, i) in visibleCards"
            :key="c._slotKey"
            class="beat-card no-image"
            role="gridcell"
            :class="[
              // Intro 8 beats (before Round 1 starts): keep cards hidden
              isIntro8 ? 'deal-hidden' : '',

              // Round 1 counts 1–8: deal in one-by-one
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
                {{ c.jp }}
              </div>

              <!-- No images in pronouns set -->
              <div class="beat-card__text beat-card__text--center">
                <div class="beat-card__en">
                  {{ c.english }}
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
          <div class="overlay-sub">Preparing audio.</div>
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

import bgUrl from '@/assets/images/games/on-the-beat/crumpled-paper-01.png'
import iconMegaphone from '@/assets/images/games/on-the-beat/megaphone.png'
import iconLightning from '@/assets/images/games/on-the-beat/lightning.png'
import iconExclamation from '@/assets/images/games/on-the-beat/exclamation.png'
import iconLightbulb from '@/assets/images/games/on-the-beat/lightbulb.png'
import homeIconUrl from '@/assets/images/icons/home-icon.png'
import songUrl from '@/assets/sounds/music/on-the-beat.mp3'

type Phase = 'idle' | 'loading' | 'countdown' | 'playing' | 'finished'
type Mode = 'menu' | 'game'
type SetKey = 'pronouns'

type CardWord = {
  english: string
  jp: string
}

type SlotCard = CardWord & { _slotKey: string }

const router = useRouter()

/** ===== Root vars for background ===== */
const rootVars = computed(() => ({
  '--otb-bg-url': `url("${bgUrl}")`,
}))

/** ===== Corner icon sources ===== */
const cornerTL = iconMegaphone
const cornerTR = iconLightning
const cornerBL = iconExclamation
const cornerBR = iconLightbulb

/** ===== Menu state ===== */
const mode = ref<Mode>('menu')
const selectedSetKey = ref<SetKey>('pronouns')
const showEnglish = ref<boolean>(true) // forced ON for pronouns
const showJapanese = ref<boolean>(false)

/** ===== Game phases ===== */
const phase = ref<Phase>('idle')
const loadProgress = ref<number>(0)
const countdownNumber = ref<number>(3)

/** ===== Pronouns hard-coded set =====
 * Each round must produce 8 cards laid out as:
 * A B C D
 * A B C D
 */
const PRONOUNS_SET = {
  label: 'Pronouns',
  games: [
    // Game 1 (5 rounds)
    [
      // Round 1: I / my / me / mine (duplicate row)
      [
        { english: 'I', jp: 'わたし' },
        { english: 'my', jp: 'わたしの' },
        { english: 'me', jp: 'わたしを／に' },
        { english: 'mine', jp: 'わたしのもの' },
      ],
      // Round 2: you / your / you / yours
      [
        { english: 'you', jp: 'あなた' },
        { english: 'your', jp: 'あなたの' },
        { english: 'you', jp: 'あなたを／に' },
        { english: 'yours', jp: 'あなたのもの' },
      ],
      // Round 3: it / its / it / X
      [
        { english: 'it', jp: 'それ' },
        { english: 'its', jp: 'それの' },
        { english: 'it', jp: 'それを／に' },
        { english: 'X', jp: '—' },
      ],
      // Round 4: Mao / Mao’s / Mao / Mao’s
      [
        { english: 'Mao', jp: 'マオ' },
        { english: "Mao’s", jp: 'マオの' },
        { english: 'Mao', jp: 'マオ' },
        { english: "Mao’s", jp: 'マオの' },
      ],
      // Round 5: Ken / Ken’s / Ken / Ken’s
      [
        { english: 'Ken', jp: 'ケン' },
        { english: "Ken’s", jp: 'ケンの' },
        { english: 'Ken', jp: 'ケン' },
        { english: "Ken’s", jp: 'ケンの' },
      ],
    ],
    // Game 2 (5 rounds)
    [
      // Round 1: he / his / him / his
      [
        { english: 'he', jp: 'かれ' },
        { english: 'his', jp: 'かれの' },
        { english: 'him', jp: 'かれを／に' },
        { english: 'his', jp: 'かれのもの' },
      ],
      // Round 2: she / her / her / hers
      [
        { english: 'she', jp: 'かのじょ' },
        { english: 'her', jp: 'かのじょの' },
        { english: 'her', jp: 'かのじょを／に' },
        { english: 'hers', jp: 'かのじょのもの' },
      ],
      // Round 3: we / our / us / ours
      [
        { english: 'we', jp: 'わたしたち' },
        { english: 'our', jp: 'わたしたちの' },
        { english: 'us', jp: 'わたしたちを／に' },
        { english: 'ours', jp: 'わたしたちのもの' },
      ],
      // Round 4: you / your / you / yours
      [
        { english: 'you', jp: 'あなた(たち)' },
        { english: 'your', jp: 'あなた(たち)の' },
        { english: 'you', jp: 'あなた(たち)を／に' },
        { english: 'yours', jp: 'あなた(たち)のもの' },
      ],
      // Round 5: they / their / them / theirs
      [
        { english: 'they', jp: 'かれら／かのじょら' },
        { english: 'their', jp: 'かれらの' },
        { english: 'them', jp: 'かれらを／に' },
        { english: 'theirs', jp: 'かれらのもの' },
      ],
    ],
  ],
} as const

const SETS: Record<SetKey, typeof PRONOUNS_SET> = {
  pronouns: PRONOUNS_SET,
}

/** ===== Multi-game ===== */
const gameIndex = ref<number>(0) // 0..(games-1)
const totalGamesInSet = computed(() => SETS[selectedSetKey.value].games.length)
const totalRoundsOverall = computed(() => totalGamesInSet.value * 5)
const overallRoundNumber = computed(() => gameIndex.value * 5 + roundIndex.value + 1)

const showContinueButton = ref<boolean>(false)
const showFinishButton = ref<boolean>(false)

/** ===== Timing model =====
 * Song structure (beats):
 * - Intro: 8 beats (NOT part of Round 1)
 * - Rounds: 5 rounds * 16 beats = 80 beats
 *   - counts 1–8: show / (Round 1 also deals in here)
 *   - counts 9–16: highlight 1-by-1
 */
const INTRO_BEATS = 8
const ROUNDS = 5
const beatsPerRound = 16
const DEFAULT_SONG_DURATION_SEC = 30

// Requested speed
const BEAT_SPEED_MULT = 0.88

const songDurationSec = ref<number>(DEFAULT_SONG_DURATION_SEC)
const beatIntervalMs = computed(() => {
  const roundDurationMs = Math.round((songDurationSec.value * 1000) / ROUNDS)
  return Math.max(80, Math.round((roundDurationMs / beatsPerRound) * BEAT_SPEED_MULT))
})

/** ===== Game state ===== */
const roundIndex = ref<number>(0) // 0..4
const beatInRound = ref<number>(0) // 0..15 (debug)
const highlightedIndex = ref<number>(-1)
const visibleCards = ref<SlotCard[]>([])
const dealCount = ref<number>(0)

const isBeating = ref<boolean>(false)
const isIntro8 = ref<boolean>(true)
const isRound1Deal = ref<boolean>(false)

const isExploding = ref<boolean>(false)
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

/** ===== WebAudio ===== */
let ac: AudioContext | null = null
let audioBuffer: AudioBuffer | null = null
let bufferSource: AudioBufferSourceNode | null = null
let gainNode: GainNode | null = null

let audioStartPerf = 0
let audioEndTimer: number | null = null

/** timers */
let beatTimeout: number | null = null
let hardStopTimer: number | null = null

/** ===== Menu logic ===== */
const canStart = computed(() => {
  const set = SETS[selectedSetKey.value]
  return !!set?.games?.length
})

// English forced ON for pronouns
watch(
  selectedSetKey,
  () => {
    showEnglish.value = true
  },
  { immediate: true }
)

function selectSet(k: SetKey) {
  selectedSetKey.value = k
  showEnglish.value = true
}

/** ===== Navigation ===== */
function onExitToDeckViewer() {
  try {
    router.back()
  } catch {
    /* ignore */
  }
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

/** ===== Round building (fixed order, no randomness) ===== */
function getRound4Words(setKey: SetKey, g: number, r: number): CardWord[] {
  const set = SETS[setKey]
  const game = set.games[g]
  const round = game[r]
  return round as unknown as CardWord[]
}

function build8SlotsFrom4WordsFixed(four: CardWord[]): SlotCard[] {
  const eight = [...four, ...four] // two identical rows
  return eight.map((w, i) => ({
    ...w,
    _slotKey: `${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`,
  }))
}

function applyRoundCards(setKey: SetKey, g: number, r: number) {
  const four = getRound4Words(setKey, g, r)
  visibleCards.value = build8SlotsFrom4WordsFixed(four)
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

function resetGameState(fullReset = true) {
  roundIndex.value = 0
  beatInRound.value = 0
  highlightedIndex.value = -1
  dealCount.value = 0
  isBeating.value = false

  isIntro8.value = true
  isRound1Deal.value = false

  isExploding.value = false
  showContinueButton.value = false
  showFinishButton.value = false

  if (fullReset) {
    gameIndex.value = 0
  }
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
  resetGameState(true)
  visibleCards.value = []
  phase.value = 'idle'
  mode.value = 'menu'
}

function returnToMenuFromFinish() {
  clearTimers()
  stopWebAudio()
  resetGameState(true)
  visibleCards.value = []
  phase.value = 'idle'
  mode.value = 'menu'
}

/** ===== End-of-game: explode then Continue/Finish ===== */
function triggerExplodeAndEndOfSegment() {
  if (isExploding.value || showContinueButton.value || showFinishButton.value) return

  phase.value = 'finished'
  highlightedIndex.value = -1
  isBeating.value = false
  isExploding.value = true

  window.setTimeout(() => {
    isExploding.value = false
    visibleCards.value = []

    const hasNextGame = gameIndex.value < totalGamesInSet.value - 1
    showContinueButton.value = hasNextGame
    showFinishButton.value = !hasNextGame
  }, EXPLODE_MS + 40)
}

function onAudioEnded() {
  clearTimers()
  triggerExplodeAndEndOfSegment()
}

/**
 * Beat scheduler:
 * - Song beats 0..7: INTRO (not part of any round)
 * - Then rounds: 5 * 16 beats
 */
function startBeatScheduler(setKey: SetKey, g: number) {
  const interval = beatIntervalMs.value
  const totalSongBeats = INTRO_BEATS + ROUNDS * beatsPerRound

  const tick = () => {
    if (phase.value !== 'countdown' && phase.value !== 'playing') return

    const elapsedMs = performance.now() - audioStartPerf
    const songBeat = Math.max(0, Math.floor(elapsedMs / interval))

    // end guard
    if (songBeat >= totalSongBeats) {
      triggerExplodeAndEndOfSegment()
      return
    }

    // corner icons: instant flip each beat
    isBeating.value = songBeat % 2 === 1

    // INTRO beats (0..7)
    if (songBeat < INTRO_BEATS) {
      isIntro8.value = true
      isRound1Deal.value = false
      dealCount.value = 0
      highlightedIndex.value = -1

      // Countdown mapping across 8 beats:
      // beats 0-1 -> 3, 2-3 -> 2, 4-5 -> 1, 6-7 -> hide overlay
      if (songBeat < 2) countdownNumber.value = 3
      else if (songBeat < 4) countdownNumber.value = 2
      else if (songBeat < 6) countdownNumber.value = 1
      else {
        countdownNumber.value = 0
        phase.value = 'playing'
      }

      beatInRound.value = 0
      return scheduleNext(songBeat + 1, interval)
    }

    // ROUNDS begin after intro
    isIntro8.value = false
    phase.value = 'playing'

    const roundBeat = songBeat - INTRO_BEATS // 0..79
    const r = Math.floor(roundBeat / beatsPerRound) // 0..4
    const b = roundBeat % beatsPerRound // 0..15

    roundIndex.value = clamp(r, 0, ROUNDS - 1)
    beatInRound.value = b

    // New round boundary
    if (b === 0) {
      applyRoundCards(setKey, g, roundIndex.value)
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

    return scheduleNext(songBeat + 1, interval)
  }

  function scheduleNext(nextSongBeat: number, intervalMs: number) {
    const nextAt = audioStartPerf + nextSongBeat * intervalMs
    const delay = Math.max(0, nextAt - performance.now())
    beatTimeout = window.setTimeout(tick, delay)
  }

  // Prepare visuals
  applyRoundCards(setKey, g, 0)
  dealCount.value = 0
  highlightedIndex.value = -1
  isIntro8.value = true
  isRound1Deal.value = false

  tick()
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/** ===== Start / Continue ===== */
async function startGame() {
  gameIndex.value = 0
  await startGameInternalForCurrentGame()
}

async function continueToNextGame() {
  if (gameIndex.value >= totalGamesInSet.value - 1) return
  clearTimers()
  stopWebAudio()

  gameIndex.value += 1
  showContinueButton.value = false
  showFinishButton.value = false

  await startGameInternalForCurrentGame()
}

async function startGameInternalForCurrentGame() {
  if (!canStart.value) return

  phase.value = 'loading'
  mode.value = 'game'

  // reset per-game state (do NOT reset gameIndex)
  resetGameState(false)
  visibleCards.value = []
  loadProgress.value = 0

  const setKey = selectedSetKey.value
  const g = gameIndex.value

  // deterministic preloads (no card images in pronouns set)
  const imgUrls = [bgUrl, cornerTL, cornerTR, cornerBL, cornerBR, homeIconUrl].filter(Boolean)
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

  // fallback visuals-only
  if (!audioBuffer) {
    audioStartPerf = performance.now() + 90
    startBeatScheduler(setKey, g)
    hardStopTimer = window.setTimeout(
      () => triggerExplodeAndEndOfSegment(),
      Math.round(songDurationSec.value * 1000) + 900
    )
    return
  }

  bufferSource = ctx.createBufferSource()
  bufferSource.buffer = audioBuffer
  gainNode = ctx.createGain()
  gainNode.gain.value = 1
  bufferSource.connect(gainNode)
  gainNode.connect(ctx.destination)

  const leadMs = 120
  const latencySec = (ctx.baseLatency ?? 0) + (ctx.outputLatency ?? 0)
  const latencyMs = Math.max(0, Math.round(latencySec * 1000))

  const startCtxTime = ctx.currentTime + leadMs / 1000
  bufferSource.start(startCtxTime)

  // Anchor beats to audible output
  audioStartPerf = performance.now() + leadMs + latencyMs

  bufferSource.onended = () => onAudioEnded()
  audioEndTimer = window.setTimeout(
    () => onAudioEnded(),
    Math.round(audioBuffer.duration * 1000) + leadMs + latencyMs + 120
  )

  startBeatScheduler(setKey, g)

  hardStopTimer = window.setTimeout(() => {
    if (phase.value === 'countdown' || phase.value === 'playing') triggerExplodeAndEndOfSegment()
  }, Math.round(audioBuffer.duration * 1000) + leadMs + latencyMs + 1200)
}

/** ===== Lifecycle ===== */
onMounted(() => {
  // Prime image assets
  void preloadImagePromise(bgUrl)
  void preloadImagePromise(cornerTL)
  void preloadImagePromise(cornerTR)
  void preloadImagePromise(cornerBL)
  void preloadImagePromise(cornerBR)
  void preloadImagePromise(homeIconUrl)

  // Enforce English always on for pronouns
  showEnglish.value = true
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
   MENU
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
  0% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
  100% { transform: rotate(-3deg); }
}

.menu-subtitle {
  margin: 0;
  font-size: 1.02rem;
  font-family: "Comic Sans MS", "Comic Sans", cursive;
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
  box-shadow: 0 10px 0 rgba(0, 0, 0, 0.14);
  padding: 14px 14px 12px;
}

.menu-card--start {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center; /* center Play button */
  gap: 10px;
}

.menu-card--start .sq-btn--primary {
  width: min(520px, 90%);
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
   BUTTONS — same as OnTheBeat.vue
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

.sq-btn--primary {
  height: 54px;
  font-size: 1.05rem;
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
  display: none; /* keep for debugging, hidden by default */
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
  min-width: 320px;
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
   FINISH/CONTINUE BUTTON — BIG, CENTERED
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

/* ============================================================================
   CARD GRID
   ============================================================================ */
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
  box-shadow: 0 12px 0 rgba(0, 0, 0, 0.18);
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
  grid-template-rows: auto 1fr;
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

/* English centered when there is no image */
.beat-card__text--center {
  display: grid;
  place-items: center;
  min-height: 140px;
}

.beat-card__en {
  font-weight: 1000;
  font-size: 1.7rem;
  line-height: 1.1;
  word-break: break-word;
  padding: 0 10px;
  text-align: center;
}

.beat-card.is-highlighted {
  outline: 5px solid rgba(0, 0, 0, 0.78);
  outline-offset: -5px;
  transform: translateY(-2px);
  box-shadow: 0 14px 0 rgba(0, 0, 0, 0.22);
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
    transform:
      translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(var(--sc));
  }
}

/* ============================================================================
   OVERLAYS
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
  box-shadow: 0 12px 0 rgba(0, 0, 0, 0.20);
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

  .beat-card__en {
    font-size: 1.4rem;
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
