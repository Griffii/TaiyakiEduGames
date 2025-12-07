<!-- src/views/flashcard-system/SoundMatcher.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameTransitStore } from '@/stores/gameTransit'
import { supabase } from '@/lib/supabase'
import UserLevels from '@/components/UserLevels.vue'

type UUID = string
type Flashcard = {
  id: UUID
  english: string
  image_url: string
  japanese?: { kanji?: string | null; furigana?: string | null } | null
}
type RoundResult = {
  id: UUID
  english: string
  correct: boolean
  responseMs: number
}

const router = useRouter()
const route = useRoute()
const transit = useGameTransitStore()

/** Transit-derived config */
const deckName = computed(() => transit.deckName || 'Listening')
const allCards = computed<Flashcard[]>(() => transit.cards || [])
const startDifficulty = computed<'easy' | 'hard'>(() => transit.startMode ?? 'easy')
const audioLocale = computed(() => transit.audioLocale || 'en-US')
const ttsRate = computed(() => typeof transit.ttsRate === 'number' ? transit.ttsRate : 1.0)

/** Phases */
const phase = ref<'menu' | 'playing' | 'results'>('menu')

/** Menu selections */
type Mode = 'text' | 'image' | 'imageText'
const selectedMode = ref<Mode>('text')
const selectedDifficulty = ref<'easy' | 'hard'>(startDifficulty.value)

/** Card-count gating */
const tooFewForHard = computed(() => allCards.value.length < 6)
const tooFewToPlay = computed(() => allCards.value.length < 3)

/** Game state */
const loading = ref(true)
const choiceCount = computed(() => (selectedDifficulty.value === 'easy' ? 3 : 6))
const queue = ref<Flashcard[]>([])
const current = ref<Flashcard | null>(null)
const choices = ref<Flashcard[]>([])
const roundIdx = ref(0)
const totalScore = ref(0)
const correctStreak = ref(0)
const startedAt = ref<number>(0)
const selectionLocked = ref(false)
const revealCorrectId = ref<UUID | null>(null)

/** Animations / sequencing */
const renderRound = ref(0)
const clickedId = ref<UUID | null>(null)
const clickedWasCorrect = ref<boolean | null>(null)
const pendingAdvance = ref(false)
const readyBoard = ref(false)

/** Streak */
const streakMultInt = computed(() => clamp(1 + Math.floor(correctStreak.value / 5), 1, 5))
const streakBump = ref(false)

/** Results */
const results = ref<RoundResult[]>([])
const summaryRows = ref<RoundResult[]>([])
const perWordResults = computed(() => results.value)

/** Audio */
const bestAudioByCard = ref<Map<UUID, { url: string; mime?: string }>>(new Map())
const htmlAudioCache = new Map<UUID, HTMLAudioElement>()

/** Assets */
import homeIcon from '@/assets/images/icons/home-icon.png'
import backIcon from '@/assets/images/icons/back-icon.png'
import sfxCorrectUrl from '@/assets/sounds/Wood_Block.ogg'
import sfxWrongUrl from '@/assets/sounds/arcade_beep_01.mp3'
import sfxStreakUrl from '@/assets/sounds/increasing-beeps.mp3'
const sfxCorrect = new Audio(sfxCorrectUrl)
const sfxWrong = new Audio(sfxWrongUrl)
const sfxStreak = new Audio(sfxStreakUrl)


/** Levels overlay */
const levelsRef = ref<InstanceType<typeof UserLevels> | null>(null)

/** Audio selection */
async function prefetchBestAudio(cardIds: UUID[], localeHint = 'en-US') {
  if (!cardIds.length) return
  const { data, error } = await supabase
    .from('flashcard_audio')
    .select('card_id, audio_url, audio_mime, source, locale, speed, status')
    .in('card_id', cardIds)
    .eq('status', 'ready')
  if (error) { console.warn('[sound-matcher] audio fetch error', error); return }

  const pickRank = (row: any) => {
    let prio = 3
    if (row.locale === localeHint && row.speed === 'normal') prio = 1
    else if (row.locale === localeHint) prio = 2
    else if (String(row.locale || '').startsWith('en')) prio = 2.5
    const humanBias = row.source === 'human' ? -0.25 : 0
    return prio + humanBias
  }

  const byCard: Record<string, any[]> = {}
  for (const r of data || []) (byCard[r.card_id] ||= []).push(r)

  const map = new Map<UUID, { url: string; mime?: string }>()
  for (const id of cardIds) {
    const rows = (byCard[id] || []).sort((a, b) => pickRank(a) - pickRank(b))
    if (rows[0]) map.set(id, { url: rows[0].audio_url, mime: rows[0].audio_mime })
  }
  bestAudioByCard.value = map
}

/** Utils */
function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
function sample<T>(arr: T[], n: number, exceptId?: UUID): T[] {
  const pool = exceptId ? arr.filter((a: any) => a.id !== exceptId) : [...arr]
  shuffleInPlace(pool)
  return pool.slice(0, n)
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

/** Speech */
function getPreferredVoice(voices: SpeechSynthesisVoice[], hint = 'en-US') {
  return voices.find(v => v.lang === hint) || voices.find(v => v.lang?.startsWith('en')) || voices[0]
}
async function playPrompt(card: Flashcard) {
  const best = bestAudioByCard.value.get(card.id)
  if (best?.url) {
    let el = htmlAudioCache.get(card.id)
    if (!el) {
      el = new Audio(best.url)
      el.preload = 'auto'
      htmlAudioCache.set(card.id, el)
    } else {
      el.currentTime = 0
    }
    try { await el.play(); return } catch {}
  }
  const utter = new SpeechSynthesisUtterance(card.english ?? '')
  const all = speechSynthesis.getVoices()
  utter.voice = getPreferredVoice(all, audioLocale.value)
  utter.rate = ttsRate.value
  speechSynthesis.cancel()
  speechSynthesis.speak(utter)
}
function replay() { if (current.value) playPrompt(current.value) }

/** Rounds & scoring */
function buildChoices(target: Flashcard) {
  const distractors = sample(allCards.value, choiceCount.value - 1, target.id)
  choices.value = shuffleInPlace([...distractors, target])
}

async function startRound() {
  selectionLocked.value = false
  revealCorrectId.value = null
  clickedId.value = null
  clickedWasCorrect.value = null

  current.value = queue.value[roundIdx.value] ?? null
  if (!current.value) { endGame(); return }

  buildChoices(current.value)
  await nextTick()
  startedAt.value = performance.now()
  playPrompt(current.value)
}

/** Trigger a full board replace */
function advanceAfterAnimations() {
  pendingAdvance.value = true
  renderRound.value += 1
}
async function onBoardAfterLeave() {
  if (!pendingAdvance.value) return
  pendingAdvance.value = false
  roundIdx.value += 1
  await startRound()
}
function onBoardAfterEnter() { /* no dynamic resizing now */ }

function selectChoice(card: Flashcard) {
  if (selectionLocked.value || !current.value) return
  selectionLocked.value = true
  clickedId.value = card.id

  const elapsedMs = performance.now() - startedAt.value
  const correct = card.id === current.value.id
  clickedWasCorrect.value = correct

  if (correct) {
    try { sfxCorrect.currentTime = 0; sfxCorrect.play() } catch {}

    const base = 4
    const timeBonus = clamp(2 - Math.floor((elapsedMs / 3000) * 2), 0, 2)
    const prevMult = streakMultInt.value

    correctStreak.value += 1
    const newMult = streakMultInt.value
    const gained = Math.round((base + timeBonus) * newMult)
    totalScore.value += gained

    if (newMult > prevMult) {
      try { sfxStreak.currentTime = 0; sfxStreak.play() } catch {}
      streakBump.value = false
      requestAnimationFrame(() => {
        streakBump.value = true
        setTimeout(() => (streakBump.value = false), 600)
      })
    }

    results.value.push({
      id: current.value.id,
      english: current.value.english,
      correct: true,
      responseMs: Math.round(elapsedMs)
    })
    setTimeout(() => { advanceAfterAnimations() }, 420)
  } else {
    try { sfxWrong.currentTime = 0; sfxWrong.play() } catch {}
    correctStreak.value = 0
    revealCorrectId.value = current.value.id

    results.value.push({
      id: current.value.id,
      english: current.value.english,
      correct: false,
      responseMs: Math.round(elapsedMs)
    })
    setTimeout(() => { advanceAfterAnimations() }, 480)
  }
}

/** XP & summary */
const XP_DAMPING = 1.0
const xpBreakdown = ref<{ listening: number; reading: number }>({ listening: 0, reading: 0 })
function endGame() {
  const total = Math.round(totalScore.value * XP_DAMPING)
  if (selectedMode.value === 'text') {
    const listening = Math.round(total * 0.7)
    xpBreakdown.value = { listening, reading: total - listening }
  } else {
    xpBreakdown.value = { listening: total, reading: 0 }
  }
  phase.value = 'results'
  startSummary()
}
async function startSummary() {
  summaryRows.value = []
  const rows = perWordResults.value.slice()
  let i = 0
  const rowTimer = window.setInterval(() => {
    if (i >= rows.length) { clearInterval(rowTimer); return }
    summaryRows.value.push(rows[i++])
  }, 180)

  await nextTick()
  window.setTimeout(() => {
    const { listening, reading } = xpBreakdown.value
    if (levelsRef.value?.open) levelsRef.value.open()
    // @ts-ignore
    if (listening > 0 && levelsRef.value?.addListeningXp) levelsRef.value.addListeningXp(listening)
    // @ts-ignore
    else if (listening > 0 && levelsRef.value?.addWritingXp) levelsRef.value.addWritingXp(listening)
    if (reading > 0 && levelsRef.value?.addReadingXp) levelsRef.value.addReadingXp(reading)
    // @ts-ignore
    else if (reading > 0 && levelsRef.value?.addWritingXp) levelsRef.value.addWritingXp(reading)
  }, 450)
}

/** Controls */
function startGame() {
  queue.value = shuffleInPlace(allCards.value.slice())
  prefetchBestAudio(queue.value.map(c => c.id), audioLocale.value).finally(async () => {
    loading.value = false
    readyBoard.value = false
    await nextTick()
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => {}
    roundIdx.value = 0
    results.value = []
    totalScore.value = 0
    correctStreak.value = 0
    phase.value = 'playing'
    renderRound.value = 0
    await nextTick()
    startRound()
    await nextTick()
    readyBoard.value = true
  })
}
function endEarly() { endGame() }
function goHome() {
  phase.value = 'menu'
  results.value = []
  totalScore.value = 0
  correctStreak.value = 0
  roundIdx.value = 0
  renderRound.value = 0
  current.value = null
  choices.value = []
  revealCorrectId.value = null
  clickedId.value = null
  clickedWasCorrect.value = null
}
function goBack() { router.back() }

/** Resilience: restore transit on refresh / deep-link */
function restoreFromSessionIfNeeded() {
  if (transit.cards && transit.cards.length) return true
  try {
    const raw = sessionStorage.getItem('eitake.soundmatcher.transit.v1')
    if (!raw) return false
    const parsed = JSON.parse(raw || '{}') as {
      cards?: Flashcard[]
      deckName?: string
      startMode?: 'easy' | 'hard'
      deckId?: string
      audioLocale?: string
      ttsRate?: number
    }

    const deckIdParam = (route.params?.deckId as string) || parsed.deckId || null
    ;(transit as any).seedForListening?.({
      deckId: deckIdParam || undefined,
      deckName: parsed.deckName || undefined,
      cards: parsed.cards || [],
      startMode: parsed.startMode || 'easy',
      audioLocale: parsed.audioLocale || 'en-US',
      ttsRate: typeof parsed.ttsRate === 'number' ? parsed.ttsRate : 1.0,
    }) ?? transit.set({
      cards: parsed.cards || [],
      mode: 'listening',
      startMode: (parsed.startMode as any) || 'easy',
      deckName: parsed.deckName || '',
      deckId: deckIdParam || undefined,
      audioLocale: parsed.audioLocale || 'en-US',
      ttsRate: typeof parsed.ttsRate === 'number' ? parsed.ttsRate : 1.0,
    })

    selectedDifficulty.value = (transit.startMode ?? 'easy') as 'easy' | 'hard'
    return (transit.cards?.length || 0) > 0
  } catch { return false }
}

/** ====== FIXED, 3-TIER SIZING (NO CSS VARS) ====== */
type ViewSize = 'sm' | 'md' | 'lg'
const viewSize = ref<ViewSize>('md')

function pickViewSize(w: number): ViewSize {
  if (w >= 1024) return 'lg'
  if (w >= 600) return 'md'
  return 'sm'
}

/** Sizes per tier & mode (width x height in px) */
const SIZES = {
  sm: { // phones (<=599) — bumped up a bit
    gap: 9,
    text:      { w: 104, h: 60 },
    image:     { w: 120, h: 128 },
    imageText: { w: 120, h: 148 },
    paddings: { lr: 12, tb: 16 }
  },
  md: { // tablets (600–1023)
    gap: 12,
    text:      { w: 140, h: 84 },
    image:     { w: 168, h: 184 },
    imageText: { w: 168, h: 204 },
    paddings: { lr: 24, tb: 28 }
  },
  lg: { // desktops (>=1024)
    gap: 16,
    text:      { w: 200, h: 120 },
    image:     { w: 220, h: 236 },
    imageText: { w: 220, h: 260 },
    paddings: { lr: 40, tb: 40 }
  }
} as const


const sizeKeyForMode = computed<'text' | 'image' | 'imageText'>(() => {
  return selectedMode.value
})

const currentSize = computed(() => {
  const tier = SIZES[viewSize.value]
  return { ...tier[sizeKeyForMode.value], gap: tier.gap }
})

const boardStyle = computed(() => {
  const { w, h, gap } = currentSize.value
  const rows = choiceCount.value === 3 ? '1' : '2'
  return {
    display: 'grid',
    gap: `${gap}px`,
    gridTemplateColumns: `repeat(3, ${w}px)`,
    gridTemplateRows: rows === '1' ? `${h}px` : `repeat(2, ${h}px)`,
    alignContent: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    width: '100%',
    maxWidth: '100%'
  } as Record<string, string>
})

const cardBoxStyle = computed(() => {
  const { w, h } = currentSize.value
  return {
    width: `${w}px`,
    height: `${h}px`
  } as Record<string, string>
})

function handleResize() {
  viewSize.value = pickViewSize(window.innerWidth)
}

watch([choiceCount, () => selectedMode.value], () => {
  // nothing else to recompute; sizes are fixed by tier
})

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize, { passive: true })
  window.addEventListener('orientationchange', handleResize, { passive: true })
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orientationchange', handleResize)
})
</script>

<template>
  <section class="sound-matcher" :class="['tier-' + viewSize]">
    <!-- XP overlay -->
    <UserLevels ref="levelsRef" :overlay="true" />

    <!-- Top bar -->
    <header class="topbar">
      <div class="left">
        <button class="icon-btn" @click="goBack" aria-label="Back">
          <img :src="homeIcon" alt="" />
        </button>
        <h2 class="title">{{ deckName }}</h2>
      </div>
      <div class="right">
        <button
          v-if="phase === 'playing'"
          class="flat-btn danger"
          @click="endEarly"
          aria-label="End Game"
        >
          End Game
        </button>
        <button class="icon-btn home" @click="goHome" aria-label="Home">
          <img :src="backIcon" alt="" />
        </button>
      </div>
    </header>

    <!-- Menu Phase -->
    <div v-if="phase === 'menu'" class="menu-wrap">
      <div class="menu-card">
        <h3 class="menu-title">Sound Matcher</h3>

        <div v-if="tooFewToPlay" class="warning">
          <p><strong>Please choose more cards.</strong></p>
          <p class="jp">もっとカードを選んでください。</p>
          <button
            class="flat-btn back-to-deck"
            @click="router.push({ name: 'deck', params: { id: transit.deckId || (route.params.deckId as string) } })"
          >
            Back to Deck / デッキへ戻る
          </button>
        </div>

        <template v-else>
          <div class="menu-section">
            <p class="label">Mode</p>
            <div class="seg">
              <button :class="['seg-btn', { active: selectedMode==='text' }]" @click="selectedMode='text'">Words</button>
              <button :class="['seg-btn', { active: selectedMode==='image' }]" @click="selectedMode='image'">Images</button>
              <button :class="['seg-btn', { active: selectedMode==='imageText' }]" @click="selectedMode='imageText'">Images + Words</button>
            </div>
          </div>

          <div class="menu-section">
            <p class="label">Difficulty</p>
            <div class="seg">
              <button
                :class="['seg-btn', { active: selectedDifficulty==='easy' }]"
                @click="selectedDifficulty='easy'"
              >
                Easy (3)
              </button>
              <button
                :class="['seg-btn', { active: selectedDifficulty==='hard' }]"
                :disabled="tooFewForHard"
                title="Need at least 6 cards"
                @click="!tooFewForHard && (selectedDifficulty='hard')"
              >
                Hard (6)
              </button>
            </div>
            <p v-if="tooFewForHard" class="muted need-more">Need at least 6 cards for Hard.</p>
          </div>

          <button class="play-btn" @click="startGame">Play ▶</button>
        </template>
      </div>
    </div>

    <!-- Playing Phase -->
    <div v-else-if="phase === 'playing'" class="play-area">
      <div class="controls">
        <button class="replay-btn" @click="replay" title="Hear again" aria-label="Replay">🔊</button>
      </div>

      <div
        v-if="streakMultInt >= 2"
        class="streak-big"
        :data-mult="streakMultInt"
        :class="{ bump: streakBump }"
      >
        x{{ streakMultInt }}
      </div>

      <div class="stage">
        <transition name="board" mode="out-in" @after-leave="onBoardAfterLeave" @after-enter="onBoardAfterEnter">
          <div class="round-wrap" :key="renderRound">
            <div
              v-if="readyBoard"
              class="board"
              :style="boardStyle"
              :class="[
                `choices-${choiceCount}`,
                selectedMode==='image' ? 'image-mode' : (selectedMode==='imageText' ? 'image-text-mode' : 'text-mode')
              ]"
            >
              <button
                v-for="c in choices"
                :key="c.id"
                class="choice card"
                :style="cardBoxStyle"
                :class="{
                  reveal: revealCorrectId && c.id === revealCorrectId,
                  correct: clickedId===c.id && clickedWasCorrect===true,
                  wrong: clickedId===c.id && clickedWasCorrect===false
                }"
                @click="selectChoice(c)"
              >
                <template v-if="selectedMode==='text'">
                  <span class="label">{{ (c.english || '').trim() }}</span>
                </template>

                <template v-else-if="selectedMode==='image'">
                  <img class="img" :src="c.image_url" alt="" draggable="false" />
                </template>

                <template v-else>
                  <div class="image-text-wrap">
                    <img class="img" :src="c.image_url" alt="" draggable="false" />
                    <span class="label below">{{ (c.english || '').trim() }}</span>
                  </div>
                </template>
              </button>
            </div>
          </div>
        </transition>
      </div>

      <footer class="status" aria-live="polite">
        <div class="status-chip">
          <div class="score">Score: {{ totalScore }}</div>
          <div class="dot" aria-hidden="true">•</div>
          <div class="round">{{ roundIdx + 1 }} / {{ queue.length }}</div>
        </div>
      </footer>
    </div>

    <!-- Results Phase -->
    <div v-else-if="phase === 'results'" class="results">
      <h3 class="results-title">Results</h3>

      <div class="table-wrap">
        <table class="results-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Word</th>
              <th>Correct</th>
              <th>Response (s)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in summaryRows" :key="r.id + '-' + i">
              <td>{{ i + 1 }}</td>
              <td>{{ r.english }}</td>
              <td><span :class="['badge', r.correct ? 'ok' : 'no']">{{ r.correct ? '✓' : '✗' }}</span></td>
              <td>{{ (r.responseMs / 1000).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <button class="flat-btn" @click="goHome">Home</button>
    </div>
  </section>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }
.sound-matcher { min-height: 100dvh; display: flex; flex-direction: column; overflow-x: hidden; }

/* Top bar */
.topbar {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px clamp(16px, 4vw, 24px);
  padding-left: max(clamp(16px, 4vw, 28px), env(safe-area-inset-left));
  padding-right: max(clamp(16px, 4vw, 28px), env(safe-area-inset-right));
  background: #ffffffcc; backdrop-filter: blur(6px);
  border-bottom: 1px solid #e5e7eb;
  overflow: hidden;
}
.topbar .left, .topbar .right { display: flex; align-items: center; gap: 12px; min-width: 0; }
.title {
  margin: 0; font-weight: 800; font-size: clamp(16px, 2.2vw, 20px); color: #0f172a;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60vw;
}
.icon-btn {
  display: inline-grid; place-items: center;
  width: 40px; height: 40px; border-radius: 10px;
  border: 1px solid #e5e7eb; background: #fff; cursor: pointer;
  transition: transform .12s ease, background .12s ease; flex: 0 0 auto;
}
.icon-btn:hover { transform: translateY(-1px); background: #f8fafc; }
.icon-btn:focus-visible { outline: none; box-shadow: var(--focus-ring, 0 0 0 3px rgba(15,23,42,.25)); }
.icon-btn img { width: 22px; height: 22px; object-fit: contain; }

/* Topbar action buttons */
.flat-btn {
  padding: 8px 12px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; color: #0f172a;
  font-weight: 700; cursor: pointer; transition: transform .12s ease, background .12s ease, box-shadow .12s ease;
  white-space: nowrap;
}
.flat-btn:hover { transform: translateY(-1px); background: #f8fafc; }
.flat-btn:focus-visible { outline: none; box-shadow: var(--focus-ring, 0 0 0 3px rgba(15,23,42,.25)); }

/* Danger variant with accent gradient */
.flat-btn.danger{
  border-color: color-mix(in srgb, var(--accent-danger, #ef4444) 65%, #000 35%);
  color: var(--btn-danger-on, #fff);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-danger, #ef4444) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-danger, #ef4444) 70%, #000 30%) 85%
    );
}
.flat-btn.danger:hover { filter: brightness(1.02); transform: translateY(-1px); }

/* Menu */
.menu-wrap {
  display: grid; place-items: center; flex: 1;
  padding: clamp(24px, 4vw, 48px);
  padding-left: max(clamp(16px, 4vw, 28px), env(safe-area-inset-left));
  padding-right: max(clamp(16px, 4vw, 28px), env(safe-area-inset-right));
  overflow-x: hidden;
}
.menu-card {
  width: min(840px, 100%);
  /* Theme tokens, matching Bomb/Sharknado modal card */
  background: var(--modal-surface, #fff);
  color: var(--modal-on-surface, #0f172a);
  border: 1px solid var(--modal-border, #e5e7eb);
  border-radius: var(--modal-radius, 16px);
  box-shadow: var(--modal-shadow, 0 10px 30px rgba(15,23,42,.06));
  padding: clamp(20px, 3vw, 32px);
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.menu-title { margin: 6px 0 18px; font-size: clamp(22px, 3.4vw, 32px); font-weight: 900; }
.menu-section { margin: 22px 0; width: 100%; }
.menu-section .label { margin: 0 0 10px; font-weight: 800; color: var(--modal-on-surface, #334155); text-align: center; }

/* Segmented control (token-friendly) */
.seg {
  display: inline-flex; justify-content: center; align-items: center; gap: 10px;
  border: 1px solid var(--modal-border, #e2e8f0); border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--modal-surface, #fff) 88%, #0f172a 12%);
  padding: 6px; margin: 0 auto;
}
.seg-btn {
  padding: 10px 18px; min-width: 120px; font-weight: 800; background: transparent; border: 0; border-radius: 999px; cursor: pointer;
  color: var(--modal-on-surface, #0f172a);
  transition: transform .12s ease, filter .12s ease, background-color .12s ease;
}
.seg-btn.active {
  background: color-mix(in srgb, var(--accent-primary, #22c55e) 18%, var(--modal-surface, #fff) 82%);
}
.seg-btn[disabled] { opacity: .5; cursor: not-allowed; }
.seg-btn:hover:not([disabled]) { transform: translateY(-1px); filter: brightness(1.03); }
.need-more { margin-top: 8px; }

/* Play button (primary gradient w/ tokens) */
.play-btn {
  margin: 24px auto 0; width: auto; min-width: 220px; max-width: 320px;
  padding: 14px 22px; border-radius: 12px; border: 1px solid color-mix(in srgb, var(--accent-primary, #22c55e) 65%, #000 35%);
  color: var(--btn-primary-on, #fff);
  font-weight: 900; font-size: 18px; cursor: pointer; transition: transform .12s ease, filter .12s ease, box-shadow .12s ease;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-primary, #22c55e) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-primary, #22c55e) 70%, #000 30%) 85%
    );
  box-shadow: var(--elevation-1, 0 6px 16px rgba(2,6,23,.06));
}
.play-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
.play-btn:focus-visible { outline: none; box-shadow: var(--focus-ring, 0 0 0 3px rgba(15,23,42,.25)); }
@media (max-width: 480px) { .play-btn { width: 100%; max-width: none; } }

/* Warning */
.warning {
  width: 100%; max-width: 520px; margin: 12px auto 0; padding: 18px;
  border-radius: 12px; border: 1px solid #fde68a; background: #fffbeb; color: #92400e;
  box-shadow: 0 6px 18px rgba(0,0,0,.04);
}
.warning .jp { margin: 6px 0 12px; }

/* Playing area */
.play-area {
  display: grid; grid-template-rows: auto 1fr auto; gap: 16px; flex: 1;
  padding: 18px clamp(16px, 4vw, 24px) 24px;
  padding-left: max(clamp(16px, 4vw, 28px), env(safe-area-inset-left));
  padding-right: max(clamp(16px, 4vw, 28px), env(safe-area-inset-right));
  overflow-x: hidden;
}
.controls { display: flex; align-items: center; justify-content: center; }
.replay-btn {
  font-size: clamp(26px, 4vw, 34px);
  padding: .4rem .7rem; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease; box-shadow: 0 6px 14px rgba(0,0,0,.06);
}
.replay-btn:hover { transform: translateY(-1px) scale(1.05); }
.replay-btn:focus-visible { outline: none; box-shadow: var(--focus-ring, 0 0 0 3px rgba(15,23,42,.25)); }

/* Streak (with border + animated bump) */
.streak-big {
  position: absolute;
  right: clamp(10px, 3vw, 28px);
  top: 90px;
  font-weight: 1000;
  line-height: 1;
  font-size: clamp(32px, 4.6vw, 50px);
  color: #ef4444;
  pointer-events: none;
  user-select: none;
  transform-origin: top right;
  text-shadow: 0 1px 2px rgba(0,0,0,.22), 0 6px 18px rgba(0,0,0,.18);

  /* New border + chip feel */
  padding: 8px 12px;
  border: 3px solid #ef4444;
  border-radius: 12px;
  background: rgba(255, 241, 242, 0.85); /* light red tint */
  box-shadow:
    0 6px 18px rgba(239,68,68,.18),
    inset 0 -2px 0 rgba(255,255,255,.35);
}

/* When the multiplier bumps, do a quick bounce then a subtle shake */
.streak-big.bump {
  animation:
    streak-bounce 0.5s cubic-bezier(.2,.9,.2,1),
    streak-shake 0.8s ease-in-out 0.2s;
}

@keyframes streak-bounce {
  0%   { transform: scale(1) translateZ(0); }
  35%  { transform: scale(1.12) translateZ(0); }
  100% { transform: scale(1) translateZ(0); }
}

@keyframes streak-shake {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  20%      { transform: translateX(-3px) rotate(-1deg); }
  40%      { transform: translateX(3px) rotate(1deg); }
  60%      { transform: translateX(-2px) rotate(-0.6deg); }
  80%      { transform: translateX(2px) rotate(0.6deg); }
}


/* Stage + round wrap with smaller mobile paddings to prevent overflow */
.stage { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; max-width: 100%; overflow: visible; }
.round-wrap {
  overflow: visible; width: 100%; max-width: 100%;
  padding-left: max(clamp(12px, 6vw, 64px), env(safe-area-inset-left));
  padding-right: max(clamp(12px, 6vw, 64px), env(safe-area-inset-right));
  padding-top: clamp(16px, 6vw, 56px);
  padding-bottom: clamp(16px, 6vw, 56px);
}

/* Board container (grid styles are inline) */
.board { width: 100%; max-width: 100%; margin: 0 auto; }

/* Cards */
.card {
  border-radius: 16px; border: 1px solid #e5e7eb; background: #fff;
  box-shadow: 0 6px 16px rgba(2,6,23,.06), inset 0 -2px 0 rgba(255,255,255,.6);
  display: grid; place-items: center; padding: clamp(8px, 2vw, 14px);
  cursor: pointer; outline: 2px solid transparent;
  transition: transform .14s ease, box-shadow .14s ease, outline-color .14s ease, filter .14s ease;
}
.card:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 10px 24px rgba(2,6,23,.10); }
.card:focus-visible { outline: none; box-shadow: var(--focus-ring, 0 0 0 3px rgba(15,23,42,.25)); }
.card.reveal { outline-color: #22c55e; box-shadow: 0 0 0 6px rgba(34,197,94,.12) inset; }

/* Image-only */
.img {
  width: 90%; height: 90%;
  object-fit: contain; user-select: none; -webkit-user-drag: none;
}

/* Images + Words */
.image-text-wrap {
  display: grid; grid-template-rows: 1fr auto; align-items: center; justify-items: center;
  width: 100%; height: 100%;
}
.image-text-wrap .img { width: 88%; height: 78%; object-fit: contain; }
.image-text-wrap .label.below {
  margin-top: 6px; font-size: clamp(13px, 2.4vw, 18px); line-height: 1.1; text-align: center; word-break: break-word; overflow: hidden;
}

/* Text-only label */
.label {
  font-weight: 900; font-size: clamp(14px, 2.8vw, 22px); line-height: 1.1;
  color: #0f172a; text-align: center; word-break: break-word; max-width: 100%; overflow: hidden;
}

/* Click outcome */
.card.correct {
  animation: bounce-correct .42s ease;
  box-shadow: 0 0 0 8px rgba(34,197,94,.18) inset, 0 10px 24px rgba(34,197,94,.18);
}
@keyframes bounce-correct {
  0% { transform: translateY(0) scale(1); }
  35% { transform: translateY(-6px) scale(1.03); }
  100% { transform: translateY(0) scale(1); }
}
.card.wrong {
  animation: shake-wrong .48s ease;
  box-shadow: 0 0 0 8px rgba(239,68,68,.18) inset, 0 10px 24px rgba(239,68,68,.18);
  filter: saturate(1.1);
}
@keyframes shake-wrong {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px) rotate(-1.5deg); }
  40% { transform: translateX(6px) rotate(1.5deg); }
  60% { transform: translateX(-4px) rotate(-1deg); }
  80% { transform: translateX(4px) rotate(1deg); }
}

/* Board transition */
.board-enter-from { opacity: 0; transform: translateX(40px); }
.board-enter-active { transition: all .46s ease; }
.board-leave-to { opacity: 0; transform: translateX(-40px); }
.board-leave-active { transition: all .46s ease; }

/* Bottom status */
.status {
  display: flex; align-items: center; justify-content: center;
  padding: 6px max(clamp(12px, 4vw, 24px), env(safe-area-inset-left)) 16px max(clamp(12px, 4vw, 24px), env(safe-area-inset-right));
  overflow-x: hidden;
}
.status-chip {
  display: inline-flex; align-items: center; gap: 10px;
  font-weight: 900; padding: 8px 12px; border-radius: 999px;
  background: rgba(255,255,255,0.92); color: #0f172a; border: 1px solid #e5e7eb; box-shadow: 0 6px 18px rgba(0,0,0,.12);
  backdrop-filter: blur(8px);
}
.status-chip .dot { opacity: .5; }

/* Results */
.results { padding: 20px clamp(16px, 4vw, 24px) 40px; display: grid; gap: 18px; place-items: center; overflow-x: hidden; }
.results-title {
  margin: 0 0 10px; font-size: clamp(32px, 4.6vw, 46px); font-weight: 1000; color: rgb(255, 255, 255);
  background: linear-gradient(135deg, rgba(255,255,255,0.275) 0%, rgba(255,255,255,0.15) 100%);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  padding: 12px 18px; border-radius: 12px; backdrop-filter: blur(12px) saturate(120%);
}
.table-wrap { width: min(900px, 100%); overflow-x: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 26px rgba(15,23,42,.06); }
.results-table { width: 100%; border-collapse: collapse; }
.results-table th, .results-table td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; text-align: left; }
.results-table thead th { background: #f8fafc; font-weight: 900; }
.badge { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 999px; font-weight: 900; color: #fff; }
.badge.ok { background: #22c55e; }
.badge.no { background: #ef4444; }
.muted { color: #64748b; }
</style>

