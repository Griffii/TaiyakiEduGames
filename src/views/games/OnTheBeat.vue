
<!-- src/views/flashcard-system/OnTheBeat.vue -->
<template>
  <section class="otb-page" :style="rootVars" aria-label="On The Beat">
    <!-- Background -->
    <div class="otb-bg" aria-hidden="true"></div>
    <div class="otb-bg-overlay" aria-hidden="true"></div>

    <!-- Back/Home (to previous screen) -->
    <button class="home-btn" type="button" @click="onExitToDeckViewer" aria-label="Back">
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

        <p class="menu-subtitle">A rhythm game</p>
      </header>

      <!-- Stacked (vertical) menu options -->
      <div class="menu-stack" aria-label="Menu options">
        <!-- Set selection + Show Words button on the right -->
        <div class="menu-card">
          <div class="menu-card__title">Set</div>
          <div class="menu-card__row menu-card__row--between">
            <div class="menu-card__row-left">
              <button
                class="sq-btn"
                type="button"
                :class="{ 'is-active': selectedSetKey === 'pronouns' }"
                @click="selectSet('pronouns')"
              >
                Pronouns
              </button>

              <button
                class="sq-btn"
                type="button"
                :class="{ 'is-active': selectedSetKey === 'demonstratives' }"
                @click="selectSet('demonstratives')"
              >
                This / That
              </button>
            </div>

            <div class="menu-card__row-right">
              <button class="sq-btn" type="button" @click="openWordsModal">Show Words</button>
            </div>
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
              :class="{ 'is-active': speed === 'speeding' }"
              @click="speed = 'speeding'"
            >
              Speeding Up
            </button>
          </div>
        </div>

        <!-- Text toggles -->
        <div class="menu-card">
          <div class="menu-card__title">Card Text</div>
          <div class="menu-card__row">
            <button class="sq-btn" type="button" :class="{ 'is-active': showJapanese }" @click="toggleJapanese">
              Japanese
            </button>

            <button class="sq-btn" type="button" :class="{ 'is-active': showEnglish }" @click="toggleEnglish">
              English
            </button>
          </div>

        </div>
      </div>

      <!-- Play button centered below the options (no grid) -->
      <div class="menu-play">
        <button class="sq-btn sq-btn--primary" type="button" :disabled="!canStart" @click="startGame">Play</button>
        <div v-if="!canStart" class="menu-warn">{{ startDisabledReason }}</div>
      </div>

      <!-- WORDS MODAL -->
      <teleport to="body">
        <div
          v-if="showWordsModal"
          class="words-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Words in set"
          @click.self="closeWordsModal"
        >
          <section class="words-modal">
            <header class="words-modal__head">
              <div class="words-modal__title">Words — {{ activeSetLabel }}</div>

              <div class="words-modal__actions">
                <button class="sq-btn" type="button" @click="closeWordsModal">Close</button>
              </div>
            </header>

            <div class="words-modal__meta">
              <div class="words-pill">Rounds: {{ allRoundsInSet.length }}</div>
              <div class="words-pill">Cards: {{ allRoundsInSet.length * 8 }}</div>
              <div class="words-pill" v-if="showJapanese">JP: On</div>
              <div class="words-pill" v-else>JP: Off</div>
              <div class="words-pill" v-if="showEnglish">EN: On</div>
              <div class="words-pill" v-else>EN: Off</div>
            </div>

            <div class="words-grid-wrap" aria-label="Words grid (scrollable)">
              <div class="words-rounds">
                <section v-for="round in allRoundsInSet" :key="round._key" class="words-round">
                  <header class="words-round__head">
                    <div class="words-round__title">Game {{ round.gameIndex + 1 }} — Round {{ round.roundIndex + 1 }}</div>
                  </header>

                  <div class="words-grid">
                    <article v-for="(w, idx) in round.words" :key="w._key + '-' + idx" class="words-card">
                      <div class="words-card__inner">
                        <!-- Image if present -->
                        <div v-if="w.img" class="words-card__img">
                          <img :src="w.img" alt="" loading="lazy" />
                        </div>

                        <!-- Text block -->
                        <div class="words-card__text" :class="{ 'words-card__text--noimg': !w.img }">
                          <div v-if="showJapanese" class="words-card__jp">
                            {{ w.jp }}
                          </div>
                          <div v-if="showEnglish" class="words-card__en">
                            {{ w.english }}
                          </div>

                          <!-- If both toggles are off, keep a placeholder so cards don't look empty -->
                          <div v-if="!showJapanese && !showEnglish" class="words-card__empty">(Text hidden)</div>
                        </div>
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </teleport>
    </section>

    <!-- GAME -->
    <section v-else class="game" aria-label="On The Beat game">
      <!-- Round counter: top-center -->
      <header class="hud" aria-label="Game HUD">
        <div class="hud-center">
          <div class="hud-pill hud-pill--round">Round {{ overallRoundNumber }} / {{ totalRoundsOverall }}</div>
        </div>

        <!-- Debug (kept, but hidden by CSS) -->
        <div class="hud-debug" aria-hidden="true">
          <div class="hud-pill hud-pill--debug">Beat {{ beatInRound + 1 }} / 16</div>
        </div>

        <div class="hud-right">
          <button class="sq-btn" type="button" @click="stopGameAndReturnToMenu">Stop</button>
        </div>
      </header>

      <div class="board" aria-label="Card board">
        <!-- Continue/Finish buttons appear where the cards used to be -->
        <div v-if="showContinueButton || showFinishButton" class="finish-center" aria-label="Continue/Finish">
          <button v-if="showContinueButton" class="sq-btn sq-btn--primary" type="button" @click="continueToNextGame">
            Continue
          </button>

          <button v-else class="sq-btn sq-btn--primary" type="button" @click="returnToMenuFromFinish">Finish</button>
        </div>

        <div v-else class="card-grid" role="grid" aria-label="8 cards">
          <article
            v-for="(c, i) in visibleCards"
            :key="c._slotKey"
            class="beat-card no-image"
            role="gridcell"
            :class="[
              isIntro8 ? 'deal-hidden' : '',
              isRound1Deal && i < dealCount ? 'deal-in' : '',
              isRound1Deal && i >= dealCount ? 'deal-hidden' : '',
              isExploding ? 'explode-out' : '',
              highlightedIndex === i ? 'is-highlighted' : ''
            ]"
            :style="isExploding ? explodeStyle(i) : undefined"
          >
            <div class="beat-card__inner">
              <div v-if="showJapanese" class="beat-card__jp">
                {{ c.jp }}
              </div>

              <div v-if="showEnglish" class="beat-card__text beat-card__text--center">
                <div class="beat-card__en">
                  {{ c.english }}
                </div>
              </div>

              <div v-else class="beat-card__text beat-card__text--spacer" aria-hidden="true"></div>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
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
type SetKey = 'pronouns' | 'demonstratives'
type SpeedKey = 'slow' | 'normal' | 'fast' | 'speeding'

type CardWord = {
  english: string
  jp: string
  img?: string | null
}

// A round can be authored as either:
// - 4 words (legacy: auto-duplicated to 8)
// - 8 words (new: explicit 8-slot sequence, supports 8 unique and/or custom ordering)
type RoundWords = CardWord[]

type SetDef = {
  label: string
  games: RoundWords[][] // games[g][r] = round words (4 or 8; normalized at runtime)
}

type SlotCard = CardWord & { _slotKey: string }

// For modal display (stable-ish key)
type ModalCard = CardWord & { _key: string }

type ModalRound = {
  _key: string
  gameIndex: number
  roundIndex: number
  words: ModalCard[] // length 8
}

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

// Defaults: JP on, EN on
const showEnglish = ref<boolean>(true)
const showJapanese = ref<boolean>(true)

// Speed (4 options)
const speed = ref<SpeedKey>('normal')

/** ===== Speed model =====
 * Keep audio + beat tracker in sync.
 * - slow/normal/fast: constant playback rate
 * - speeding: rate increases once per round (round 1..5), while beat timing follows the same rate
 */
const SPEED_RATE: Record<'slow' | 'normal' | 'fast', number> = {
  slow: 0.92,
  normal: 1.0,
  fast: 1.08,
}

const SPEEDING_START = 0.92
const SPEEDING_END = 1.08

function rateForRound(r: number): number {
  if (speed.value !== 'speeding') {
    const k = speed.value === 'slow' || speed.value === 'fast' ? speed.value : 'normal'
    return SPEED_RATE[k as 'slow' | 'normal' | 'fast'] ?? 1.0
  }

  // r: 0..4 (5 rounds)
  const step = (SPEEDING_END - SPEEDING_START) / Math.max(1, ROUNDS - 1)
  return SPEEDING_START + step * clamp(r, 0, ROUNDS - 1)
}

function rateForBeatIndex(songBeat: number): number {
  // Keep intro aligned to the same starting rate as round 0
  if (speed.value !== 'speeding') {
    const k = speed.value === 'slow' || speed.value === 'fast' ? speed.value : 'normal'
    return SPEED_RATE[k as 'slow' | 'normal' | 'fast'] ?? 1.0
  }

  if (songBeat < INTRO_BEATS) return rateForRound(0)
  const roundBeat = songBeat - INTRO_BEATS
  const r = Math.floor(roundBeat / beatsPerRound) // 0..4
  return rateForRound(r)
}

/** ===== Words modal ===== */
const showWordsModal = ref<boolean>(false)

/** ===== Game phases ===== */
const phase = ref<Phase>('idle')
const loadProgress = ref<number>(0)
const countdownNumber = ref<number>(3)

/** ===== Sets ===== */
const PRONOUNS_SET: SetDef = {
  label: 'Pronouns',
  games: [
    // Game 1 (5 rounds)
    [
      [
        { english: 'I', jp: 'わたし' },
        { english: 'my', jp: 'わたしの' },
        { english: 'me', jp: 'わたしを／に' },
        { english: 'mine', jp: 'わたしのもの' },
      ],
      [
        { english: 'you', jp: 'あなた' },
        { english: 'your', jp: 'あなたの' },
        { english: 'you', jp: 'あなたを／に' },
        { english: 'yours', jp: 'あなたのもの' },
      ],
      [
        { english: 'it', jp: 'それ' },
        { english: 'its', jp: 'それの' },
        { english: 'it', jp: 'それを／に' },
        { english: 'X', jp: '—' },
      ],
      [
        { english: 'Mao', jp: 'マオ' },
        { english: "Mao’s", jp: 'マオの' },
        { english: 'Mao', jp: 'マオ' },
        { english: "Mao’s", jp: 'マオの' },
      ],
      [
        { english: 'Ken', jp: 'ケン' },
        { english: "Ken’s", jp: 'ケンの' },
        { english: 'Ken', jp: 'ケン' },
        { english: "Ken’s", jp: 'ケンの' },
      ],
    ],
    // Game 2 (5 rounds)
    [
      [
        { english: 'he', jp: 'かれ' },
        { english: 'his', jp: 'かれの' },
        { english: 'him', jp: 'かれを／に' },
        { english: 'his', jp: 'かれのもの' },
      ],
      [
        { english: 'she', jp: 'かのじょ' },
        { english: 'her', jp: 'かのじょの' },
        { english: 'her', jp: 'かのじょを／に' },
        { english: 'hers', jp: 'かのじょのもの' },
      ],
      [
        { english: 'we', jp: 'わたしたち' },
        { english: 'our', jp: 'わたしたちの' },
        { english: 'us', jp: 'わたしたちを／に' },
        { english: 'ours', jp: 'わたしたちのもの' },
      ],
      [
        { english: 'you', jp: 'あなた(たち)' },
        { english: 'your', jp: 'あなた(たち)の' },
        { english: 'you', jp: 'あなた(たち)を／に' },
        { english: 'yours', jp: 'あなた(たち)のもの' },
      ],
      [
        { english: 'they', jp: 'かれら／かのじょら' },
        { english: 'their', jp: 'かれらの' },
        { english: 'them', jp: 'かれらを／に' },
        { english: 'theirs', jp: 'かれらのもの' },
      ],
    ],
  ],
}

const DEMONSTRATIVES_SET: SetDef = {
  label: 'This / That',
  games: [
    // Only 1 game (5 rounds)
    [
      // Round 1
      [
        { english: 'this', jp: 'これ' },
        { english: 'that', jp: 'それ' },
        { english: 'these', jp: 'これら' },
        { english: 'those', jp: 'それら' },
      ],

      // Round 2 (still authored as 4; will auto-duplicate)
      [
        { english: 'here', jp: 'ここ' },
        { english: 'there', jp: 'そこ' },
        { english: 'near', jp: 'ちかく' },
        { english: 'far', jp: 'とおく' },
      ],

      // Round 3
      [
        { english: 'this', jp: 'これ' },
        { english: 'here', jp: 'ここ' },
        { english: 'that', jp: 'それ' },
        { english: 'there', jp: 'そこ' },
      ],

      // Round 4
      [
        { english: 'this', jp: 'これ' },
        { english: 'near', jp: 'ちかく' },
        { english: 'there', jp: 'そこ' },
        { english: 'far', jp: 'とおく' },
      ],

      // Round 5 (explicit 8 words: line 1 + line 2, not forced to repeat)
      [
        { english: 'this', jp: 'これ' },
        { english: 'that', jp: 'それ' },
        { english: 'these', jp: 'これら' },
        { english: 'those', jp: 'それら' },
        { english: 'here', jp: 'ここ' },
        { english: 'there', jp: 'そこ' },
        { english: 'near', jp: 'ちかく' },
        { english: 'far', jp: 'とおく' },
      ],
    ],
  ],
}

const SETS: Record<SetKey, SetDef> = {
  pronouns: PRONOUNS_SET,
  demonstratives: DEMONSTRATIVES_SET,
}

/** ===== Multi-game ===== */
const gameIndex = ref<number>(0)
const roundIndex = ref<number>(0)
const beatInRound = ref<number>(0)
const highlightedIndex = ref<number>(-1)
const visibleCards = ref<SlotCard[]>([])
const dealCount = ref<number>(0)

const totalGamesInSet = computed(() => SETS[selectedSetKey.value].games.length)
const totalRoundsOverall = computed(() => totalGamesInSet.value * 5)
const overallRoundNumber = computed(() => gameIndex.value * 5 + roundIndex.value + 1)

const showContinueButton = ref<boolean>(false)
const showFinishButton = ref<boolean>(false)

/** ===== Modal computed: group by rounds (8 words each, with gaps) ===== */
const activeSetLabel = computed(() => SETS[selectedSetKey.value].label)

function normalizeRoundTo8(words: CardWord[]): CardWord[] {
  if (words.length === 8) return words
  if (words.length === 4) return [...words, ...words]

  if (words.length < 8) {
    const out: CardWord[] = []
    let i = 0
    while (out.length < 8) {
      out.push(words[i % words.length])
      i++
    }
    return out
  }

  return words.slice(0, 8)
}

const allRoundsInSet = computed<ModalRound[]>(() => {
  const set = SETS[selectedSetKey.value]
  const out: ModalRound[] = []

  for (let g = 0; g < set.games.length; g++) {
    for (let r = 0; r < set.games[g].length; r++) {
      const eight = normalizeRoundTo8(set.games[g][r])

      const words: ModalCard[] = eight.map((w, i) => ({
        ...w,
        _key: `${selectedSetKey.value}-${g}-${r}-${i}-${w.english}-${w.jp}-${w.img ?? ''}`,
      }))

      out.push({
        _key: `${selectedSetKey.value}-g${g}-r${r}`,
        gameIndex: g,
        roundIndex: r,
        words,
      })
    }
  }

  return out
})

/** ===== Timing model ===== */
const INTRO_BEATS = 8
const ROUNDS = 5
const beatsPerRound = 16
const DEFAULT_SONG_DURATION_SEC = 30

// Beat speed scaling
const BEAT_SPEED_MULT = 0.88

// Same tiny start delay as the flashcard version (visuals start slightly later)
const BEAT_START_DELAY_MS = 90

const songDurationSec = ref<number>(DEFAULT_SONG_DURATION_SEC)

/**
 * Base interval (at rate 1.0). Actual per-beat interval is derived from current rate.
 * For "Speeding Up" we build a per-beat timing map so the beat tracker stays aligned.
 */
const baseBeatIntervalMs = computed(() => {
  const roundDurationMs = Math.round((songDurationSec.value * 1000) / ROUNDS)
  return Math.max(40, Math.max(80, Math.round((roundDurationMs / beatsPerRound) * BEAT_SPEED_MULT)))
})

/** Built per-start: beatTimesMs[i] = time (ms) from audioStartPerf to beat i */
const beatTimesMs = ref<number[] | null>(null)

function buildBeatTimesMs(): number[] {
  const totalBeats = INTRO_BEATS + ROUNDS * beatsPerRound
  const times: number[] = new Array(totalBeats + 1)
  times[0] = 0

  for (let b = 0; b < totalBeats; b++) {
    const rate = Math.max(0.6, rateForBeatIndex(b))
    const interval = Math.max(30, Math.round(baseBeatIntervalMs.value / rate))
    times[b + 1] = times[b] + interval
  }

  return times
}

/** ===== Beat visuals ===== */
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

let beatTimeout: number | null = null
let hardStopTimer: number | null = null

/** ===== Menu logic ===== */
const textSelectionValid = computed(() => showEnglish.value || showJapanese.value)

const canStart = computed(() => {
  const set = SETS[selectedSetKey.value]
  return !!set?.games?.length && textSelectionValid.value
})

const startDisabledReason = computed(() => {
  const setOk = !!SETS[selectedSetKey.value]?.games?.length
  if (!setOk) return 'This set is unavailable.'
  return ''
})

function selectSet(k: SetKey) {
  selectedSetKey.value = k
}

function toggleEnglish() {
  showEnglish.value = !showEnglish.value
}

function toggleJapanese() {
  showJapanese.value = !showJapanese.value
}

/** ===== Words modal controls ===== */
function openWordsModal() {
  showWordsModal.value = true
}

function closeWordsModal() {
  showWordsModal.value = false
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
function getRoundWords(setKey: SetKey, g: number, r: number): CardWord[] {
  const set = SETS[setKey]
  const round = set.games[g][r]
  return normalizeRoundTo8(round)
}

function build8SlotsFromRoundWords(eight: CardWord[]): SlotCard[] {
  return eight.map((w, i) => ({
    ...w,
    _slotKey: `${Date.now()}-${Math.random().toString(16).slice(2)}-${i}`,
  }))
}

function applyRoundCards(setKey: SetKey, g: number, r: number) {
  const eight = getRoundWords(setKey, g, r)
  visibleCards.value = build8SlotsFromRoundWords(eight)
}

function updateHighlightForBeatInRound(b: number) {
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

  if (fullReset) gameIndex.value = 0
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

/** ===== Beat scheduler ===== */
function startBeatScheduler(setKey: SetKey, g: number) {
  const times = beatTimesMs.value ?? buildBeatTimesMs()
  beatTimesMs.value = times

  const totalSongBeats = INTRO_BEATS + ROUNDS * beatsPerRound

  const estimateSongBeat = (elapsedMs: number) => {
    // small beat count; linear scan is fine and resyncs if the tab lags
    let b = 0
    while (b + 1 <= totalSongBeats && times[b + 1] <= elapsedMs) b++
    return clamp(b, 0, totalSongBeats)
  }

  const tick = () => {
    if (phase.value !== 'countdown' && phase.value !== 'playing') return

    const elapsedMs = performance.now() - audioStartPerf
    const songBeat = estimateSongBeat(Math.max(0, elapsedMs))

    if (songBeat >= totalSongBeats) {
      triggerExplodeAndEndOfSegment()
      return
    }

    isBeating.value = songBeat % 2 === 1

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

    isIntro8.value = false
    phase.value = 'playing'

    const roundBeat = songBeat - INTRO_BEATS
    const r = Math.floor(roundBeat / beatsPerRound)
    const b = roundBeat % beatsPerRound

    roundIndex.value = clamp(r, 0, ROUNDS - 1)
    beatInRound.value = b

    if (b === 0) {
      applyRoundCards(setKey, g, roundIndex.value)
      highlightedIndex.value = -1
      dealCount.value = 0
    }

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
    const nextAt = audioStartPerf + (times[nextSongBeat] ?? times[times.length - 1])
    const delay = Math.max(0, nextAt - performance.now())
    beatTimeout = window.setTimeout(tick, delay)
  }

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

function scheduleSpeedRamp(ctx: AudioContext, src: AudioBufferSourceNode, startCtxTime: number) {
  if (speed.value !== 'speeding') return

  // Step rate once per round boundary (excluding intro)
  // Use the same beat-time map as the scheduler for precise alignment.
  const times = beatTimesMs.value ?? buildBeatTimesMs()
  beatTimesMs.value = times

  // initial rate at start
  src.playbackRate.setValueAtTime(rateForRound(0), startCtxTime)

  for (let r = 1; r < ROUNDS; r++) {
    const beatAtRoundStart = INTRO_BEATS + r * beatsPerRound
    const tMs = times[beatAtRoundStart] ?? 0
    const tSec = tMs / 1000
    const rt = rateForRound(r)
    src.playbackRate.setValueAtTime(rt, startCtxTime + tSec)
  }
}

function effectiveDurationMs(bufferDurationSec: number): number {
  // Conservative upper bound; onended is the primary end signal.
  if (speed.value === 'speeding') {
    return Math.round((bufferDurationSec * 1000) / Math.max(0.6, SPEEDING_START))
  }
  const rt = speed.value === 'slow' || speed.value === 'fast' ? SPEED_RATE[speed.value] : 1.0
  return Math.round((bufferDurationSec * 1000) / Math.max(0.6, rt))
}

async function startGameInternalForCurrentGame() {
  if (!canStart.value) return

  phase.value = 'loading'
  mode.value = 'game'

  resetGameState(false)
  visibleCards.value = []
  loadProgress.value = 0

  const setKey = selectedSetKey.value
  const g = gameIndex.value

  // preload: include any card images in the set (future-proof)
  const set = SETS[setKey]
  const cardImgs: string[] = []
  for (let gi = 0; gi < set.games.length; gi++) {
    for (let ri = 0; ri < set.games[gi].length; ri++) {
      const eight = normalizeRoundTo8(set.games[gi][ri])
      for (let wi = 0; wi < eight.length; wi++) {
        const u = eight[wi]?.img
        if (u) cardImgs.push(u)
      }
    }
  }

  const imgUrls = [bgUrl, cornerTL, cornerTR, cornerBL, cornerBR, homeIconUrl, ...cardImgs].filter(Boolean)
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

  // Build beat time map now that duration + speed are known
  beatTimesMs.value = buildBeatTimesMs()

  phase.value = 'countdown'
  countdownNumber.value = 3

  const ctx = await ensureAudioContext()
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {})
  }

  stopWebAudio()

  // Fallback visuals-only (still includes the same beat start delay)
  if (!audioBuffer) {
    const fallbackLead = 90
    audioStartPerf = performance.now() + fallbackLead + BEAT_START_DELAY_MS
    startBeatScheduler(setKey, g)
    hardStopTimer = window.setTimeout(
      () => triggerExplodeAndEndOfSegment(),
      Math.round(songDurationSec.value * 1000) + 900
    )
    return
  }

  bufferSource = ctx.createBufferSource()
  bufferSource.buffer = audioBuffer

  // Apply playback rate behaviour
  if (speed.value !== 'speeding') {
    const rt = speed.value === 'slow' || speed.value === 'fast' ? SPEED_RATE[speed.value] : 1.0
    bufferSource.playbackRate.value = rt
  }

  gainNode = ctx.createGain()
  gainNode.gain.value = 1
  bufferSource.connect(gainNode)
  gainNode.connect(ctx.destination)

  const leadMs = 120
  const latencySec = (ctx.baseLatency ?? 0) + (ctx.outputLatency ?? 0)
  const latencyMs = Math.max(0, Math.round(latencySec * 1000))

  const startCtxTime = ctx.currentTime + leadMs / 1000

  // If speeding up, schedule the per-round rate steps aligned to beats
  scheduleSpeedRamp(ctx, bufferSource, startCtxTime)

  bufferSource.start(startCtxTime)

  // Same small intentional delay before beat visuals begin
  audioStartPerf = performance.now() + leadMs + latencyMs + BEAT_START_DELAY_MS

  bufferSource.onended = () => onAudioEnded()

  // Use a conservative timer (onended is primary)
  const endMs = effectiveDurationMs(audioBuffer.duration)
  audioEndTimer = window.setTimeout(() => onAudioEnded(), endMs + leadMs + latencyMs + 200)

  startBeatScheduler(setKey, g)

  hardStopTimer = window.setTimeout(() => {
    if (phase.value === 'countdown' || phase.value === 'playing') triggerExplodeAndEndOfSegment()
  }, endMs + leadMs + latencyMs + 1200)
}

/** ===== Lifecycle ===== */
onMounted(() => {
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
   CORNER ICONS
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
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.92);
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
  box-shadow: 8px 10px 0 rgba(0, 0, 0, 0.92);
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

/* Stacked menu (vertical) */
.menu-stack {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.menu-card {
  background: rgba(255, 255, 255, 0.7);
  border: 2px solid rgba(0, 0, 0, 0.08);
  box-shadow: 2px 10px 0 rgba(0, 0, 0, 0.14);
  padding: 14px 14px 12px;
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

.menu-card__row--between {
  justify-content: space-between;
  align-items: center;
}

.menu-card__row-left,
.menu-card__row-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.menu-play {
  margin-top: 18px;
  display: grid;
  justify-items: center;
  gap: 10px;
}

.menu-play .sq-btn--primary {
  width: min(520px, 90%);
}

.menu-warn {
  font-size: 0.92rem;
  color: #6a1b1b;
}

/* ============================================================================
   BUTTONS
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

  box-shadow: 5px 4px 0 rgba(0, 0, 0, 0.92);

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
  box-shadow: 7px 7px 0 rgba(0, 0, 0, 0.92);
  border-color: rgba(0, 0, 0, 0.72);
}

.sq-btn:active {
  transform: translateY(4px) rotate(0deg);
  box-shadow: 5px 4px 0 rgba(0, 0, 0, 0.92);
}

.sq-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.35);
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
   WORDS MODAL
   ============================================================================ */
.words-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(2px) saturate(115%);
  -webkit-backdrop-filter: blur(2px) saturate(115%);
  display: grid;
  place-items: center;
  padding: 18px;
}

.words-modal {
  width: min(980px, calc(100vw - 28px));
  max-height: min(78vh, 760px);
  background: rgba(255, 255, 255, 0.92);
  border: 3px solid rgba(0, 0, 0, 0.22);
  box-shadow: 10px 14px 0 rgba(0, 0, 0, 0.92);
  border-radius: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto 1fr;
}

.words-modal__head {
  padding: 12px 12px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.65);
}

.words-modal__title {
  font-weight: 1000;
  letter-spacing: 0.02em;
  font-size: 1.2rem;
}

.words-modal__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.words-modal__meta {
  padding: 10px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.55);
}

.words-pill {
  padding: 6px 10px;
  border: 2px solid rgba(0, 0, 0, 0.18);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.20);
  background: rgba(255, 255, 255, 0.9);
  font-weight: 900;
  font-size: 0.95rem;
}

.words-grid-wrap {
  padding: 12px;
  overflow: auto;
}

.words-rounds {
  display: grid;
  gap: 14px; /* gap between each 8-word round block */
}

.words-round {
  padding-bottom: 14px;
  border-bottom: 2px dashed rgba(0, 0, 0, 0.14);
}

.words-round:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.words-round__head {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.words-round__title {
  font-weight: 1000;
  letter-spacing: 0.02em;
  opacity: 0.92;
}

.words-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 920px) {
  .words-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .words-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.words-card {
  background: rgba(255, 255, 255, 0.92);
  border: 2px solid rgba(0, 0, 0, 0.16);
  box-shadow: 2px 10px 0 rgba(0, 0, 0, 0.18);
  border-radius: 0;
  overflow: hidden;
  min-height: 140px;
}

.words-card__inner {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
}

.words-card__img {
  height: 92px;
  border-bottom: 2px solid rgba(0, 0, 0, 0.10);
  background: rgba(255, 255, 255, 0.75);
  display: grid;
  place-items: center;
}

.words-card__img img {
  max-width: 90%;
  max-height: 84px;
  display: block;
  object-fit: contain;
}

.words-card__text {
  padding: 10px 10px 10px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 6px;
  text-align: center;
}

.words-card__text--noimg {
  min-height: 140px;
}

.words-card__jp {
  font-weight: 1000;
  font-size: 1.05rem;
  line-height: 1.1;
}

.words-card__en {
  font-weight: 950;
  font-size: 1.1rem;
  line-height: 1.1;
  word-break: break-word;
}

.words-card__empty {
  font-weight: 900;
  opacity: 0.7;
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
  display: none;
}

.hud-pill {
  background: rgba(255, 255, 255, 0.7);
  border: 2px solid rgba(0, 0, 0, 0.30);
  box-shadow: 5px 4px 0 rgba(0, 0, 0, 0.22);
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
   FINISH/CONTINUE BUTTON
   ============================================================================ */
.finish-center .sq-btn {
  width: min(520px, 90vw);
  height: 96px;

  font-size: 2.2rem;
  font-weight: 1000;
  letter-spacing: 0.04em;

  padding: 20px 28px;

  border-width: 3px;
  box-shadow: 10px 12px 0 rgba(0, 0, 0, 0.92);
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
  box-shadow: 2px 12px 0 rgba(0, 0, 0, 0.18);
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

.beat-card__text--center {
  display: grid;
  place-items: center;
  min-height: 140px;
}

.beat-card__text--spacer {
  min-height: 140px;
}

/* ✅ Larger English text in-game */
.beat-card__en {
  font-weight: 1000;
  font-size: 2.05rem;
  line-height: 1.08;
  word-break: break-word;
  padding: 0 10px;
  text-align: center;
}

.beat-card.is-highlighted {
  outline: 5px solid rgba(0, 0, 0, 0.78);
  outline-offset: -5px;
  transform: translateY(-2px);
  box-shadow: 2px 14px 0 rgba(0, 0, 0, 0.22);
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
   OVERLAYS (game)
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
  box-shadow: 2px 12px 0 rgba(0, 0, 0, 0.20);
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
    font-size: 1.7rem;
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

  .beat-card__en {
    font-size: 1.55rem;
  }
}
</style>

