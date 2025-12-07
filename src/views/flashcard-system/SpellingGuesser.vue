<!-- src/views/flashcard-system/SpellingGuesser.vue -->
<template>
  <section class="sg-wrap" role="application" aria-label="Spelling Guesser">
    <!-- Top bar -->
    <header class="sg-head">
      <!-- Left: Back -->
      <div class="left">
        <button class="icon-bare home" @click="goBack" aria-label="Back">
          <img class="icon" :src="homeIcon" alt="" />
        </button>
      </div>

      <!-- Center: Title, sub, Category -->
      <div class="center">
        <h2 class="title">Spelling Guesser</h2>
        <div class="sub">
          Word {{ wordsDone + 1 }} / {{ totalWords }} &nbsp;•&nbsp;
          Misses {{ wrongCount }}/{{ maxWrong }}
        </div>
        <div class="category" v-if="deckTitle">Category: {{ deckTitle }}</div>
      </div>

      <!-- Right: Settings (top) + Hint (below) -->
      <div class="right">
        <button
          class="icon-bare settings"
          @click="toggleSettings"
          aria-haspopup="dialog"
          :aria-expanded="settingsOpen"
          aria-label="Settings"
          title="Settings"
        >
          <img class="icon" :src="settingsIcon" alt="" />
        </button>

        <div class="hint-wrap">
          <button
            class="btn hint lg"
            type="button"
            @click="useHint"
            :disabled="isRoundLocked || sessionEnded"
            title="Show hint (points ×0.75)"
          >
            💡 Hint
          </button>
        </div>
      </div>
    </header>

    <!-- Main column (scrollable page) -->
    <main class="sg-main">
      <!-- Life circle -->
      <div class="life-zone">
        <div
          class="life-circle"
          :class="lifeMoodClass"
          :style="{ transform: `scale(${lifeCircleScale})` }"
          role="img"
          :aria-label="`Remaining strikes: ${maxWrong - wrongCount}`"
        >
          <!-- Keep face size constant by inversely scaling it -->
          <div
            class="life-face"
            :style="{ transform: `scale(${lifeFaceScale})` }"
            @mouseenter="onFaceHover"
          >
            <span class="life-face-inner" :class="{ wiggle: wiggleOn }">
              {{ lifeFace }}
            </span>
          </div>
        </div>
      </div>

      <!-- Answer section (off-white card with border) -->
      <div class="answer-card" role="group" aria-label="Answer">
        <div class="blanks" :class="{ solved: isSolved }" aria-label="Answer slots">
          <template v-for="(slot, i) in slots" :key="i">
            <!-- Space: render a spacer block so the visual gap is obvious -->
            <div v-if="slot.isSpace" class="slot space" aria-hidden="true"></div>

            <!-- Letter slot -->
            <div v-else class="slot" :class="{ filled: !!slot.letter }">
              <span class="slot-letter" :class="{ pop: popIndices.has(i) }">
                {{ slot.letter || '' }}
              </span>
              <span class="slot-line"></span>
            </div>
          </template>
        </div>
      </div>

      <!-- Alphabet grid (right under the answer card) -->
      <div class="alpha-wrap">
        <div class="alpha-grid" role="group" aria-label="Letters">
          <button
            v-for="ch in alphabet"
            :key="ch"
            class="alpha"
            :disabled="usedLetters.has(ch) || isRoundLocked || sessionEnded"
            :class="{
              used: usedLetters.has(ch),
              good: goodLetters.has(ch),
              bad: badLetters.has(ch)
            }"
            :style="alphaStyle(ch)"
            @mouseenter="onAlphaHover(ch)"
            @focus="onAlphaHover(ch)"
            @click="onGuess(ch)"
          >
            {{ ch }}
          </button>
        </div>
      </div>
    </main>

    <!-- PERFECT! flash overlay -->
    <transition name="perfect-pop">
      <div
        v-if="perfectFlash"
        class="perfect-flash"
        aria-live="polite"
        aria-atomic="true"
      >
        PERFECT!
      </div>
    </transition>

    <!-- HINT Centered Overlay -->
    <transition name="hint-center">
      <div
        v-if="hintActive && jpKanji"
        class="hint-overlay"
        role="dialog"
        aria-modal="true"
        aria-live="polite"
      >
        <div class="hint-box">
          <div class="hint-jp">{{ jpKanji }}</div>
          <div class="hint-penalty">Points ×{{ hintPenaltyMultiplier }}</div>
        </div>
      </div>
    </transition>

    <!-- Word end popup/card -->
    <transition name="pop">
      <div v-if="wordPopupOpen" class="popup" role="dialog" aria-modal="true">
        <div class="popup-card endword-card">
          <div class="endword-grid">
            <!-- LEFT: larger image + JP + EN stacked -->
            <div class="end-left">
              <img
                v-if="currentCard?.image_url"
                :src="currentCard.image_url"
                alt=""
                class="end-img"
              />
              <div class="end-texts">
                <div class="end-jp" v-if="jpKanji">{{ jpKanji }}</div>
                <div class="end-en">{{ rawAnswer }}</div>
              </div>
            </div>

            <!-- RIGHT: numbers + multipliers -->
            <div class="end-right">
              <div class="pop-nums">
                <span>✅ {{ lastWordStats.correct }}</span>
                <span class="dot">•</span>
                <span>❌ {{ lastWordStats.wrong }}</span>
              </div>

              <div class="pop-xp-block">
                <div class="line">
                  <span>Correct × 5</span>
                  <span>+{{ lastWordStats.correct * 5 }} XP</span>
                </div>
                <div class="line">
                  <span>Wrong × 2</span>
                  <span>-{{ lastWordStats.wrong * 2 }} XP</span>
                </div>
                <div class="line">
                  <span>Subtotal</span>
                  <span>{{ lastWordBaseXp }} XP</span>
                </div>

                <div class="line" v-if="lastWordPerfect">
                  <span>Perfect Bonus</span>
                  <span>× {{ PERFECT_BONUS_MULTIPLIER }}</span>
                </div>

                <div class="line" v-if="hintUsed && lastWordStats.xp > 0">
                  <span>Hint Penalty</span>
                  <span>× {{ hintPenaltyMultiplier }}</span>
                </div>

                <div class="line total">
                  <span>Total</span>
                  <span>+{{ lastWordStats.xp }} XP</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom-centered action -->
          <div class="pop-actions">
            <button class="btn primary big" @click="nextWord">Continue →</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Settings Modal -->
    <transition name="fade">
      <div
        v-if="settingsOpen"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        @click.self="toggleSettings"
      >
        <div class="modal-card">
          <header class="modal-head">
            <h3 id="settings-title">Settings</h3>
            <button class="icon" @click="toggleSettings" aria-label="Close">✕</button>
          </header>

          <div class="modal-body">
            <fieldset class="field">
              <legend>Difficulty</legend>
              <label class="radio">
                <input type="radio" value="easy" v-model="localDifficulty" />
                Easy (12 misses)
              </label>
              <label class="radio">
                <input type="radio" value="hard" v-model="localDifficulty" />
                Hard (6 misses)
              </label>
            </fieldset>
          </div>

          <footer class="modal-foot">
            <button class="btn primary" @click="applySettings">Apply</button>
            <button class="btn danger" @click="endNow">End Game</button>
          </footer>
        </div>
      </div>
    </transition>

    <!-- End screen (no total xp counter here) -->
    <transition name="fade">
      <div v-if="sessionEnded" class="end-screen" aria-live="polite">
        <div class="end-screen-inner">
          <div class="end-top">
            <div class="end-title">Results</div>
          </div>

          <div class="end-table-wrap">
            <table class="end-table">
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>XP</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in sessionStats" :key="it.id" :class="{ perfect: it.perfect }">
                  <td class="w">{{ it.answer }}</td>
                  <td>{{ it.correct }}</td>
                  <td>{{ it.wrong }}</td>
                  <td class="xp">+{{ it.xp }}</td>
                  <td>
                    <span v-if="it.perfect" class="badge perfect-badge">PERFECT</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="end-actions">
            <button class="btn primary" @click="restart">Play Again</button>
            <button class="btn ghost" @click="goBack">Done</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Levels popup (new) -->
    <UserLevels ref="levelsRef" :overlay="true" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useGameTransitStore } from '@/stores/gameTransit'
import UserLevels from '@/components/UserLevels.vue'

import homeIcon from '@/assets/images/icons/home-icon.png'
import settingsIcon from '@/assets/images/icons/settings-icon.png'

type Card = {
  id: string
  english: string
  japanese?: string | { kanji?: string; furigana?: string }
  image_url?: string
}
type WordStat = { id: string; answer: string; correct: number; wrong: number; xp: number; perfect?: boolean }

const props = defineProps<{
  deckCards?: Card[]
  deckId?: string
  deckName?: string
  maxMisses?: number
}>()

const route = useRoute()
const router = useRouter()
const transit = useGameTransitStore()

/* Levels component ref */
const levelsRef = ref<InstanceType<typeof UserLevels> | null>(null)

/* Load cards */
const deckCardsLocal = ref<Card[]>(props.deckCards ?? [])
const deckTitle = ref<string>('')

function readFromSession(): { cards: Card[]; name?: string } {
  try {
    const raw = sessionStorage.getItem('eitake.spellingguesser.transit.v1')
    if (!raw) return { cards: [] }
    const parsed = JSON.parse(raw)
    return {
      cards: Array.isArray(parsed?.cards) ? parsed.cards : [],
      name: typeof parsed?.deckName === 'string' ? parsed.deckName : undefined
    }
  } catch { return { cards: [] } }
}

function toPublicUrl(path?: string | null) {
  if (!path) return ''
  const { data } = supabase.storage.from('public-assets').getPublicUrl(path)
  return data?.publicUrl ?? ''
}

async function loadFromSupabase(deckId: string): Promise<Card[]> {
  const { data: rows, error } = await supabase
    .from('v_deck_cards_expanded')
    .select('card_id, english, japanese_kanji, japanese_furigana, image_url, position')
    .eq('deck_id', deckId)
    .order('position', { ascending: true })
  if (error) throw error
  return (rows || []).map((r: any) => ({
    id: r.card_id,
    english: r.english ?? '',
    japanese: { kanji: r.japanese_kanji ?? '', furigana: r.japanese_furigana ?? '' },
    image_url: toPublicUrl(r.image_url),
  }))
}

async function loadDeckName(deckId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('decks')
      .select('name')
      .eq('id', deckId)
      .maybeSingle()
    if (error) throw error
    return data?.name || ''
  } catch {
    return ''
  }
}

async function ensureCardsLoaded() {
  if (deckCardsLocal.value.length) return

  if (transit.cards?.length) {
    deckCardsLocal.value = transit.cards as Card[]
    if (!deckTitle.value && (transit as any)?.deckName) deckTitle.value = (transit as any).deckName
    return
  }

  const ss = readFromSession()
  if (ss.cards.length) {
    deckCardsLocal.value = ss.cards
    if (!deckTitle.value && ss.name) deckTitle.value = ss.name
    return
  }

  const id = (props.deckId || (route.params.id as string) || '')
  if (id) {
    try {
      deckCardsLocal.value = await loadFromSupabase(id)
      if (!deckTitle.value) deckTitle.value = props.deckName || (await loadDeckName(id)) || 'Deck'
    } catch (e) { console.error(e) }
  }
}

/* Deck title resolution (initial hints; final fallback happens onMounted after ensureCardsLoaded) */
deckTitle.value =
  props.deckName ||
  (transit as any)?.deckName ||
  (route.query.title as string) ||
  deckTitle.value ||
  'Deck'

/* Game state */
const maxWrong = ref<number>(props.maxMisses ?? 6)

const hintPenaltyMultiplier = ref(0.75)

/* Settings state */
type Difficulty = 'easy' | 'hard'
const difficulty = ref<Difficulty>(maxWrong.value >= 12 ? 'easy' : 'hard')
const settingsOpen = ref(false)
const localDifficulty = ref<Difficulty>(difficulty.value)

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const deckQueue = ref<Card[]>([])
const currentCard = ref<Card | null>(null)
const rawAnswer = computed(() => (currentCard.value?.english ?? '').trim())
const jpKanji = computed(() => {
  const j = currentCard.value?.japanese
  if (!j) return ''
  return typeof j === 'string' ? j : (j.kanji || '')
})
const normAnswer = computed(() => normalizeAnswer(rawAnswer.value))

/* Slots keep a dedicated space block for gaps */
const slots = ref<{ ch: string; isSpace: boolean; letter: string | null }[]>([])
const usedLetters = ref<Set<string>>(new Set())
const goodLetters = ref<Set<string>>(new Set())
const badLetters = ref<Set<string>>(new Set())
const wrongCount = ref(0)
const isRoundLocked = ref(false)

const hintActive = ref(false)
const hintUsed = ref(false)
let hintTimer: number | null = null

const wiggleOn = ref(false)

const wordsDone = ref(0)
const totalWords = computed(() => deckCardsLocal.value.length)

const wordPopupOpen = ref(false)
const WORD_POPUP_DELAY_MS = 450
const lastWordStats = reactive<WordStat>({ id: '', answer: '', correct: 0, wrong: 0, xp: 0, perfect: false })
const lastWordBaseXp = ref(0)
const lastWordPerfect = ref(false)

const sessionStats = ref<WordStat[]>([])
const sessionEnded = ref(false)

/* PERFECT! flash state */
const perfectFlash = ref(false)
const PERFECT_BONUS_MULTIPLIER = 3
const PERFECT_FLASH_MS = 900

/* Letter pop animation */
const popIndices = ref<Set<number>>(new Set())
function triggerPop(i: number) {
  popIndices.value.delete(i)
  setTimeout(() => {
    popIndices.value.add(i)
    setTimeout(() => popIndices.value.delete(i), 250)
  }, 0)
}

/* Smiley face + mood */
const FACE_STEPS = ['😄','😃','🙂','😐','😕','🙁','☹️','😟','😣','😖','😫','😭','💀'] as const
const remaining = computed(() => Math.max(0, maxWrong.value - wrongCount.value))
const lifeFace = computed(() => {
  const total = Math.max(1, maxWrong.value)
  const i = Math.min(
    FACE_STEPS.length - 1,
    Math.floor((wrongCount.value / total) * (FACE_STEPS.length - 1))
  )
  return FACE_STEPS[i]
})

const lifeMoodClass = computed(() => {
  const r = remaining.value / Math.max(1, maxWrong.value)
  if (r > 0.66) return 'life-good'
  if (r > 0.33) return 'life-warn'
  return 'life-bad'
})

/* Keep emoji size constant while circle shrinks on every wrong */
const lifeCircleScale = computed(() => {
  const wrong = wrongCount.value
  const total = Math.max(1, maxWrong.value)
  const maxScale = 1.0
  const minScale = 0.3
  const step = (maxScale - minScale) / total
  return Math.max(minScale, maxScale - wrong * step)
})
const lifeFaceScale = computed(() => Number((1 / lifeCircleScale.value).toFixed(4)))

/* Sounds */
import clickUrl from '@/assets/sounds/Type_Click.ogg'
import revealUrl from '@/assets/sounds/Wood_Block.ogg'
import wrongUrl from '@/assets/sounds/arcade_beep_01.mp3'
import wordCompleteUrl from '@/assets/sounds/fortunegame/chukichi.mp3'
import perfectUrl from '@/assets/sounds/fanfare.mp3'
import hintUrl from '@/assets/sounds/fortunegame/shokichi.mp3'

const sfx = {
  reveal: new Audio(revealUrl),
  wrong: new Audio(wrongUrl),
  wordComplete: new Audio(wordCompleteUrl),
  perfect: new Audio(perfectUrl),
  hint: new Audio(hintUrl),
}
Object.values(sfx).forEach(a => { a.preload = 'auto'; a.volume = 0.55 })

function playHoverSfx() {
  try {
    const a = new Audio(clickUrl) // short tick
    a.volume = 0.4
    a.play().catch(() => {})
  } catch {}
}
function playOnce(a: HTMLAudioElement) {
  try { a.currentTime = 0; a.play().catch(() => {}) } catch {}
}

function onAlphaHover(ch: string) {
  if (usedLetters.value.has(ch) || isRoundLocked.value || sessionEnded.value) return
  playHoverSfx()
}

/* Derived */
const isSolved = computed(() =>
  slots.value.every(s => s.isSpace || (s.letter && s.letter.length === 1))
)

/* Lifecycle */
onMounted(async () => {
  await ensureCardsLoaded()

  // Final fallback: fetch deck title by id if still missing
  if (!deckTitle.value) {
    const id = (props.deckId || (route.params.id as string) || '')
    if (id) {
      const name = await loadDeckName(id)
      if (name) deckTitle.value = name
    }
  }

  if (!deckCardsLocal.value.length) {
    sessionEnded.value = true
    return
  }
  resetSession()
  deckQueue.value = shuffle(deckCardsLocal.value)
  startRound()
})
watch(isSolved, (v) => {
  if (v && !sessionEnded.value && !isRoundLocked.value) {
    finishWord(true)
  }
})

/* Helpers */
function normalizeAnswer(s: string): string {
  return s.toUpperCase().split('')
    .filter(ch => (ch >= 'A' && ch <= 'Z') || ch === ' ')
    .join('')
}
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function makeSlots(word: string) {
  slots.value = word.split('').map(ch => ({
    ch,
    isSpace: ch === ' ',
    letter: ch === ' ' ? null : null
  }))
}
function countRevealed(): number { return slots.value.filter(s => !s.isSpace && s.letter).length }

/* Round control */
function startRound() {
  isRoundLocked.value = false
  usedLetters.value.clear()
  goodLetters.value.clear()
  badLetters.value.clear()
  wrongCount.value = 0
  hintActive.value = false
  hintUsed.value = false
  if (hintTimer) { window.clearTimeout(hintTimer); hintTimer = null }

  currentCard.value = deckQueue.value.shift() || null
  if (!currentCard.value) { endSession(); return }

  const word = normAnswer.value
  if (!word || word.replace(/\s/g, '').length === 0) { startRound(); return }

  makeSlots(word)
}

function onGuess(ch: string) {
  if (isRoundLocked.value || sessionEnded.value) return
  if (usedLetters.value.has(ch)) return
  usedLetters.value.add(ch)

  const word = normAnswer.value
  const idxs: number[] = []
  for (let i = 0; i < word.length; i++) if (!slots.value[i].isSpace && word[i] === ch) idxs.push(i)

  if (idxs.length > 0) {
    goodLetters.value.add(ch)
    idxs.forEach(i => { slots.value[i].letter = ch; triggerPop(i) })
    playOnce(sfx.reveal)
  } else {
    badLetters.value.add(ch)
    wrongCount.value++
    playOnce(sfx.wrong)
    flashMiss()
    if (wrongCount.value >= maxWrong.value) finishWord(false)
  }
}

function flashMiss() {
  const el = document.querySelector('.sg-wrap') as HTMLElement | null
  if (!el) return
  el.classList.remove('miss')
  void el.offsetWidth
  el.classList.add('miss')
  setTimeout(() => el.classList.remove('miss'), 220)
}

/* Emoji wiggle (rotation only; size stays constant) */
function onFaceHover() {
  if (wiggleOn.value) return
  wiggleOn.value = true
  window.setTimeout(() => { wiggleOn.value = false }, 650) // match CSS duration
}

/* Hint */
function useHint() {
  if (isRoundLocked.value || sessionEnded.value) return
  hintUsed.value = true
  hintActive.value = true
  playOnce(sfx.hint)
  if (hintTimer) window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => { hintActive.value = false }, 1400)
}

/* Word end / XP */
function computeBaseXp(correct: number, wrong: number): number {
  const raw = correct * 5 + wrong * (-2)
  return Math.max(0, Math.round(raw))
}

function finishWord(solved: boolean) {
  isRoundLocked.value = true

  const correct = countRevealed()
  const wrong = wrongCount.value

  const base = computeBaseXp(correct, wrong)
  lastWordBaseXp.value = base

  // Perfect if solved AND zero wrong guesses
  const isPerfect = solved && wrong === 0
  lastWordPerfect.value = isPerfect

  let final = 0
  if (solved) {
    final = base
    if (isPerfect) final = Math.round(final * PERFECT_BONUS_MULTIPLIER)
    if (hintUsed.value && final > 0) final = Math.round(final * hintPenaltyMultiplier.value)
  }

  const stat: WordStat = {
    id: currentCard.value!.id,
    answer: rawAnswer.value,
    correct,
    wrong,
    xp: final,
    perfect: isPerfect
  }
  sessionStats.value.push(stat)
  Object.assign(lastWordStats, stat)

  // Orchestrate PERFECT! flash before popup if applicable
  if (isPerfect) {
    playOnce(sfx.perfect) 
    perfectFlash.value = true
    setTimeout(() => {
      perfectFlash.value = false
      setTimeout(() => {
        wordPopupOpen.value = true
        playOnce(sfx.wordComplete)
      }, WORD_POPUP_DELAY_MS)
    }, PERFECT_FLASH_MS)
  } else {
    setTimeout(() => {
      wordPopupOpen.value = true
      playOnce(sfx.wordComplete)
    }, WORD_POPUP_DELAY_MS)
  }
}

function nextWord() {
  wordPopupOpen.value = false
  wordsDone.value++

  if (wordsDone.value >= deckCardsLocal.value.length) {
    endSession()
  } else {
    startRound()
  }
}

/* End session: show results table, then open UserLevels and split XP (70% Writing, 30% Reading) */
function endSession() {
  sessionEnded.value = true

  // Wait for the end screen (table) to be in DOM, then open levels overlay and add XP
  nextTick().then(() => {
    window.setTimeout(() => {
      const total = sessionStats.value.reduce((a, b) => a + b.xp, 0)
      if (total <= 0) return
      const writing = Math.round(total * 0.7)
      const reading = total - writing

      levelsRef.value?.open()
      levelsRef.value?.addReadingXp(reading)
      levelsRef.value?.addWritingXp(writing)
    }, 400)
  })
}

function restart() {
  resetSession()
  deckQueue.value = shuffle(deckCardsLocal.value)
  startRound()
}
function resetSession() {
  sessionEnded.value = false
  sessionStats.value = []
  wordsDone.value = 0
  wordPopupOpen.value = false
  perfectFlash.value = false
}

function goBack() {
  router.back()
}

function endNow() {
  if (sessionEnded.value) return
  sessionEnded.value = true

  // Same XP handoff as normal end
  nextTick().then(() => {
    window.setTimeout(() => {
      const total = sessionStats.value.reduce((a, b) => a + b.xp, 0)
      if (total <= 0) return
      const writing = Math.round(total * 0.7)
      const reading = total - writing

      levelsRef.value?.open()
      levelsRef.value?.addWritingXp(writing)
      levelsRef.value?.addReadingXp(reading)
    }, 400)
  })
}

/* Settings handlers */
function toggleSettings() {
  localDifficulty.value = difficulty.value
  settingsOpen.value = !settingsOpen.value
}
function applySettings() {
  difficulty.value = localDifficulty.value
  maxWrong.value = difficulty.value === 'easy' ? 12 : 6

  if (wrongCount.value >= maxWrong.value && !isRoundLocked.value && !sessionEnded.value) {
    finishWord(false)
  }
  settingsOpen.value = false
}

/* >>> Inline style resolver to beat any external transparencies <<< */
function alphaStyle(ch: string): Record<string, string> {
  // Defaults
  let backgroundColor = '#f8f8f8'
  let color = '#000000'
  let borderColor = '#3a3a3a'
  let boxShadow = '0 4px 0 rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.12)'

  if (goodLetters.value.has(ch)) {
    backgroundColor = 'lightgreen'
    color = '#063b25'
    borderColor = '#2fc386'
    boxShadow = '0 2px 0 rgba(0,0,0,.12)'
  } else if (badLetters.value.has(ch)) {
    backgroundColor = 'lightcoral'
    color = '#1f2937'
    borderColor = '#8fa1b8'
    boxShadow = '0 2px 0 rgba(0,0,0,.12)'
  } else if (usedLetters.value.has(ch)) {
    backgroundColor = '#f0f0f0'
    color = '#111111'
    borderColor = '#666666'
  }

  return { backgroundColor, color, borderColor, boxShadow }
}
</script>

<style scoped>
/* ====== Base & layout (explicit colors) ====== */
.sg-wrap{
  min-height:100vh; /* allow scroll */
  color:#111111;
  display:grid; grid-template-rows:auto 1fr;
  gap:12px; padding:12px 16px; position:relative;
  overflow:auto;
}
.sg-wrap.miss{ animation:missflash .22s ease; }
@keyframes missflash{ 0%{box-shadow:inset 0 0 0 0 rgba(255,0,0,0)}40%{box-shadow:inset 0 0 0 9999px rgba(255,60,0,.08)}100%{box-shadow:inset 0 0 0 0 rgba(255,0,0,0)} }

.sg-head{
  display:grid;
  grid-template-columns: 1fr auto 1fr;
  align-items:start; /* align top so settings/back icons share the same baseline */
  gap:8px;
}
.sg-head .left{ justify-self:start; }
.sg-head .right{ justify-self:end; display:flex; flex-direction:column; gap:6px; align-items:end; }
.sg-head .center{ text-align:center; }

/* Icon-only buttons (Back/Settings) */
.icon-bare{
  display:inline-grid; place-items:center;
  width:44px; height:44px;
  background:none; border:none; padding:0; margin:0;
  transition: transform .16s ease, filter .16s ease;
}
.icon-bare .icon{ width:28px; height:28px; display:block; }
.icon-bare:hover{ transform:scale(1.08); filter:brightness(1.08); }
.icon-bare.settings:hover{ transform:scale(1.08) rotate(18deg); }

/* Top-center spacing */
.sg-head .title{ margin:0; font-size:1.3rem; color:#ffffff; text-shadow:0 2px rgba(0,0,0,.28); }
.sg-head .sub{ font-size:.95rem; color:#ffffff; opacity:.95; margin-top:8px; }
.sg-head .category{ margin-top:16px; font-weight:800; color:#ffffff; letter-spacing:.2px; }

/* Main column spacing */
.sg-main{
  display:grid;
  grid-template-rows: auto auto auto;
  justify-items:center;
  align-content:start;
  gap:28px;
  width:100%;
}

/* Life circle */
.life-zone{ display:grid; place-items:center; gap:10px; margin-top:10px; }
.life-circle{
  width:200px; height:200px;
  border-radius:50%;
  transition: transform 180ms ease, background 200ms ease;
  position: relative;
  display: grid; place-items:center;
  box-shadow:0 16px 30px rgba(0,0,0,.15), inset 0 -8px 16px rgba(0,0,0,.08);
  outline:4px solid rgba(0,0,0,.08);
}
.life-face{
  font-size:4.8rem;
  user-select:none;
  /* keep transform only for inverse scale; rotation happens on inner span */
  transition: transform 180ms ease;
}
.life-face-inner{
  display:inline-block; /* enables rotation without affecting parent's scale */
}
.life-face-inner.wiggle{
  animation: faceWiggle 650ms ease-in-out both;
}
@keyframes faceWiggle{
  0%   { transform: rotate(0deg); }
  20%  { transform: rotate(-6deg); }
  40%  { transform: rotate(6deg); }
  60%  { transform: rotate(-4deg); }
  80%  { transform: rotate(3deg); }
  100% { transform: rotate(0deg); }
}
.life-good{ background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.6), rgba(255,255,255,.2)), linear-gradient(180deg,#b6f1d8,#6de8b5); }
.life-warn{ background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.6), rgba(255,255,255,.2)), linear-gradient(180deg,#ffe6a7,#ffc36a); }
.life-bad{  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.6), rgba(255,255,255,.2)), linear-gradient(180deg,#ffd1d1,#ff8b8b); }

/* Hint dropdown is replaced by centered overlay */
.hint-wrap{ position:relative; }

/* Buttons (explicit colors for in-game; keep) */
.btn{
  padding:8px 12px; border-radius:12px; border:2px solid rgba(0,0,0,.18); background:#ffffff; color:#111111;
  font-weight:900; box-shadow:0 6px 0 rgba(0,0,0,.12), 0 8px 18px rgba(0,0,0,.16);
  transition:transform .12s ease, filter .12s ease;
}
.btn:hover{ transform:translateY(-2px); filter:brightness(1.03); }
.btn.hint{ background:linear-gradient(180deg,#ffe7f6,#ffd1ef); color:#6b0f4f; border-color:rgba(0,0,0,.1); }
.btn.hint.lg{ padding:10px 14px; font-size:1.05rem; } /* larger hint button */

/* Theme-compliant gradients for modal/CTA buttons */
.btn.primary{
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-primary) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-primary) 70%, #000 30%) 85%
    );
  color: var(--btn-primary-on);
  border-color: color-mix(in srgb, var(--accent-primary) 65%, #000 35%);
}
.btn.primary.big{ padding:12px 18px; font-size:1.05rem; }
.btn.danger{
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-danger) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-danger) 70%, #000 30%) 85%
    );
  color: var(--btn-danger-on);
  border-color: color-mix(in srgb, var(--accent-danger) 65%, #000 35%);
}

/* ====== Answer section card ====== */
.answer-card{
  width:min(1000px, 94vw);
  background:#fbfbfb;                 /* off-white */
  border:2px solid #d1d5db;           /* gray border */
  border-radius:20px;
  padding:16px 14px;
  box-shadow:0 8px 20px rgba(0,0,0,.06);
}

/* Answer lines inside the card */
.blanks{
  display:flex; flex-wrap:wrap; gap:14px 10px; padding:4px; justify-content:center; min-height:70px;
}
.slot{ position:relative; width:42px; height:60px; display:grid; place-items:end center; }
.slot.space{
  width:32px; height:60px;
}
.slot-line{ display:block; width:100%; height:0; border-bottom:3px solid #111111; border-radius:2px; }
.slot-letter{
  position:absolute; bottom:10px; font-size:1.6rem; font-weight:900; text-transform:uppercase; line-height:1; color:#111111;
  transform-origin:50% 100%;
}
.slot-letter.pop{ animation:pop .22s ease; }
@keyframes pop{ 0%{transform:scale(.6) translateY(4px); opacity:.1} 100%{transform:scale(1) translateY(0); opacity:1} }

/* Alphabet grid (sits right below answer card) */
.alpha-wrap{ width:80vw; max-width:1100px; }
@media (max-width: 720px){ .alpha-wrap{ width:92vw; } }
.alpha-grid{
  display:grid;
  grid-template-columns: repeat(10, 1fr);
  gap:8px; justify-items:center;
}
@media (max-width: 1080px){ .alpha-grid{ grid-template-columns: repeat(9, 1fr); } }
@media (max-width: 860px){ .alpha-grid{ grid-template-columns: repeat(8, 1fr); } }
@media (max-width: 640px){ .alpha-grid{ grid-template-columns: repeat(7, 1fr); } }
@media (max-width: 460px){ .alpha-grid{ grid-template-columns: repeat(6, 1fr); } }

/* Letter buttons (explicit colors) */
.alpha{
  width:100%;
  aspect-ratio: 1 / 1;
  border:2px solid #3a3a3a;
  border-radius:8px;

  background-color:#f8f8f8 !important;
  color:#000000 !important;
  opacity:1 !important;

  appearance:none; -webkit-appearance:none;
  box-shadow:0 4px 0 rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.12) !important;
  transition: transform .12s ease, filter .12s ease, background-color .12s ease, color .12s ease, border-color .12s ease, box-shadow .12s ease;
  font-weight:900; font-size:.98rem;
  line-height:1;
  padding:0;
}

/* Hover/focus */
.alpha:hover:not(:disabled),
.alpha:focus-visible{
  transform: translateY(-2px);
  filter: brightness(1.03);
  background-color:#e6f3ff !important;
  color:#000000 !important;
  outline:2px solid #7cc3ff;
  outline-offset:2px;
}

/* Good/Bad states (CSS backup; inline style already enforces it) */
.alpha.good,
.alpha.good:disabled{
  background-color: lightgreen !important;
  color:#063b25 !important;
  border-color:#2fc386 !important;
  box-shadow:0 2px 0 rgba(0,0,0,.12) !important;
}
.alpha.bad,
.alpha.bad:disabled{
  background-color: lightcoral !important;
  color:#1f2937 !important;
  border-color:#8fa1b8 !important;
  box-shadow:0 2px 0 rgba(0,0,0,.12) !important;
}

/* Disabled fallback */
.alpha:disabled{
  cursor: default !important;
  opacity: 1 !important;
  filter: none !important;
  background-color:#f8f8f8 !important;
}

/* PERFECT! overlay */
.perfect-flash{
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 60;
  pointer-events: none;
  font-weight: 1000;
  font-size: clamp(2.4rem, 8vw, 6rem);
  color: #10b981; /* emerald-ish */
  text-shadow: 0 0 24px rgba(16,185,129,.6), 0 0 48px rgba(16,185,129,.35);
  animation: perfectBurst 900ms cubic-bezier(.2,1.2,.2,1);
}
@keyframes perfectBurst{
  0%   { transform: scale(.6); opacity: 0; filter: brightness(1.2); }
  30%  { transform: scale(1.2); opacity: 1; }
  60%  { transform: scale(.95); }
  100% { transform: scale(1.02); opacity: 1; }
}

/* Centered Hint overlay */
.hint-overlay{
  position:fixed; inset:0; z-index:55;
  display:grid; place-items:center;
  background: rgba(0,0,0,.25);
  backdrop-filter: blur(2px);
}
.hint-box{
  width:min(640px, 90vw);
  background:#ffffff;
  border:2px solid rgba(0,0,0,.1);
  border-radius:18px;
  box-shadow:0 10px 30px rgba(0,0,0,.25);
  padding:18px;
  text-align:center;
}
.hint-jp{
  font-size: clamp(1.3rem, 3.8vw, 2.1rem);
  font-weight: 900;
  color:#111111;
  margin-bottom:8px;
}
.hint-penalty{
  font-size: clamp(1rem, 3vw, 1.4rem);
  font-weight: 1000;
  color:#dc2626; /* red */
}
.hint-center-enter-from{ opacity:0; transform: translateY(8px) scale(.98); }
.hint-center-enter-active{ transition: all 180ms ease; }
.hint-center-leave-to{ opacity:0; transform: translateY(-6px) scale(.98); }
.hint-center-leave-active{ transition: all 200ms ease; }

/* Popups & end screen (explicit colors) */
.popup{ position:fixed; inset:0; display:grid; place-items:center; backdrop-filter:blur(3px); background:rgba(0,0,0,.25); z-index:40; }
.popup-card{
  background:#ffffff; color:#111111; border:2px solid rgba(0,0,0,.1); border-radius:18px;
  width:min(820px,92vw);
  box-shadow:0 10px 30px rgba(0,0,0,.25);
  display:grid; grid-template-rows:auto auto; gap:12px; padding:16px;
}

/* Word Complete layout */
.endword-grid{
  display:grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap:16px;
  align-items:start;
}
@media (max-width: 620px){
  .endword-grid{ grid-template-columns: 1fr; }
}

/* Bigger gap between image and text block */
.end-left{
  display:grid;
  grid-template-columns:140px 1fr;
  gap: clamp(20px, 3vw, 32px); /* increased spacing */
  align-items:center;
}
@media (max-width: 620px){
  .end-left{
    grid-template-columns:120px 1fr;
    gap: clamp(16px, 4vw, 24px);
  }
}
.end-img{
  width:160px; height:160px;
  object-fit:contain; border-radius:14px; background:#ffffff; border:2px solid #eef2f7; box-shadow:0 6px 14px rgba(0,0,0,.12);
}
@media (max-width: 620px){
  .end-img{ width:130px; height:130px; }
}
.end-texts{ display:grid; gap:6px; }
.end-jp{ font-weight:900; font-size:1.25rem; color:#0f5132; }
.end-en{ font-weight:800; font-size:1.05rem; color:#334155; }

.end-right{ display:grid; gap:10px; }
.pop-nums{ display:flex; align-items:center; gap:8px; color:#374151; margin:0; }
.pop-nums .dot{ opacity:.45; }
.pop-xp-block{ border-top:2px dashed rgba(0,0,0,.12); padding-top:10px; display:grid; gap:8px; }
.pop-xp-block .line{ display:flex; justify-content:space-between; font-weight:700; }
.pop-xp-block .total{ font-weight:900; color:#0f5132; }

/* Bottom centered action */
.pop-actions{
  display:flex; justify-content:center; align-items:center; padding-top:6px;
}
.pop-actions .btn.big{ min-width:220px; }

/* ===== Settings modal — THEME TOKENS (matches Bomb/Sharknado) ===== */
.modal{
  position:fixed; inset:0; display:grid; place-items:center;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  -webkit-backdrop-filter: var(--modal-overlay-filter);
  z-index:45;
}
.modal-card{
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  padding:18px; width:min(720px,92vw);
}
.modal-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.modal-head .icon{ background:none; border:none; font-size:1.1rem; opacity:.9; color: var(--modal-on-surface); }
.modal-body{ display:grid; gap:14px; }
.field{ display:grid; gap:6px; }
.field legend{ font-weight:900; margin-bottom:6px; color: var(--modal-on-surface); }
.field .radio{ display:flex; gap:8px; align-items:center; font-weight:700; color: var(--modal-on-surface); }
.modal-foot{ display:flex; gap:10px; justify-content:flex-end; }

/* End screen — glassy, table-only */
.end-screen{
  position:fixed; inset:0; z-index:50;
  background: rgba(0,0,0,.3);
  display:grid; place-items:center;
  backdrop-filter: blur(2px);
}
.end-screen-inner{
  width:min(1100px, 94vw);
  background: rgba(255,255,255,0.7);
  -webkit-backdrop-filter: saturate(120%) blur(10px);
  backdrop-filter: saturate(120%) blur(10px);
  border: 1px solid rgba(255,255,255,0.6);
  border-radius:18px;
  padding:18px;
  box-shadow:0 10px 30px rgba(0,0,0,.25);
  display:grid; gap:14px;
}
.end-top{ text-align:center; }
.end-title{ font-weight:900; color:#334155; margin-bottom:6px; }

.end-table-wrap{ max-height:54vh; overflow:auto; border:1px solid rgba(0,0,0,.08); border-radius:12px; background:rgba(255,255,255,0.8); }
.end-table{ width:100%; border-collapse:collapse; }
.end-table th, .end-table td{ padding:10px 12px; border-bottom:1px solid #eef2f7; text-align:left; }
.end-table thead th{ background:#f8fafc; position:sticky; top:0; z-index:1; }
.end-table td.w{ font-weight:800; }
.end-table td.xp{ font-weight:900; color:#065f46; }
.end-table tr.perfect { background: rgba(16,185,129,0.08); }
.badge{
  display:inline-block; padding:4px 8px; border-radius:9999px; font-weight:900; font-size:.8rem;
  border:2px solid rgba(0,0,0,.08); background:#fff;
}
.perfect-badge{ color:#065f46; border-color:#34d399; background:#d1fae5; }
.end-actions{ display:flex; justify-content:center; gap:10px; }

/* Transitions */
.pop-enter-from,.pop-leave-to{ opacity:0; transform:translateY(8px) scale(.98); }
.pop-enter-active,.pop-leave-active{ transition:all 180ms ease; }
.fade-enter-from,.fade-leave-to{ opacity:0; }
.fade-enter-active,.fade-leave-active{ transition:opacity 160ms ease; }

/* Responsive popup image */
@media (max-width: 560px){
  .pop-hero{ grid-template-columns:1fr; text-align:center; }
  .pop-hero img{ width:100px; height:100px; justify-self:center; }
}
</style>

