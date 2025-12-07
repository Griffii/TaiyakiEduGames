<!-- src/views/flashcard-system/SpellingBlitz.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/users'
import UserLevels from '@/components/UserLevels.vue'

type UUID = string
type JapaneseField =
    | string
    | { kanji?: string; furigana?: string }
    | null
    | undefined

type Card = {
    id: string
    english: string
    image_url?: string
    audio_url?: string
    tags?: string[]
    japanese?: JapaneseField
}

type Slot =
    | { type: 'letter'; index: number; ch: string }
    | { type: 'space' }

type WordGroup =
    | { type: 'word'; slots: Array<{ index: number; ch: string }> }
    | { type: 'space' }

type XpBurst = { id: number; text: string; side: 'left' | 'right' }

/* -------- Props -------- */
const props = defineProps<{
    cards?: Card[]
    deckId?: UUID
    startMode?: 'easy' | 'hard'
}>()

/* -------- State -------- */
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const levelsRef = ref<InstanceType<typeof UserLevels> | null>(null)

const loading = ref(true)
const error = ref<string | null>(null)
const allCards = ref<Card[]>([])
const order = ref<number[]>([])
const index = ref(0)
const mode = ref<'easy' | 'hard'>(props.startMode ?? 'easy')

const started = ref(false)
const finished = ref(false)
const showSummary = ref(false)

const displaySlots = ref<Slot[]>([])        // visual slots (keeps spaces)
const inputLetters = ref<string[]>([])      // letters-only user input
const hintLetters = ref<string[]>([])       // letters-only hints
const currentWord = ref<string>('')         // letters-only target

const inputEl = ref<HTMLInputElement | null>(null)
const perWordStart = ref<number>(0)
const perWordMs = ref<number>(0)
const allowingInput = ref(true)

const totalXp = ref(0)
const perWordResults = ref<Array<{
    cardId: UUID
    english: string
    letters: number
    ms: number
    xpLetters: number
    xpBonus: number
    xpTotal: number
}>>([])

const hintedIndices = ref<Set<number>>(new Set())

/* -------- Sounds -------- */
import COMPLETE_SFX_URL from '@/assets/sounds/Wood_Block.ogg'
import TYPE_SFX_URL from '@/assets/sounds/Type_Click.ogg'
import CELEBRATE_SFX_URL from '@/assets/sounds/fanfare.mp3'

function makeAudio(url: string, volume = 1.0) {
    const a = new Audio(url)
    a.preload = 'auto'
    a.volume = volume
    return a
}
const typeSfx = makeAudio(TYPE_SFX_URL, 1.0)
const completeSfx = makeAudio(COMPLETE_SFX_URL, 0.3)
const celebrateSfx = makeAudio(CELEBRATE_SFX_URL, 0.5)

function playTypeSfx() { try { typeSfx.currentTime = 0; typeSfx.play() } catch { } }
function playCompleteSfx() { try { completeSfx.currentTime = 0; completeSfx.play() } catch { } }
function playCelebrateSfx() { try { celebrateSfx.currentTime = 0; celebrateSfx.play() } catch { } }

/* -------- XP / Multiplier -------- */
const XP_PER_LETTER = computed(() => (mode.value === 'easy' ? 1 : 3))
const BASE_BONUS = computed(() => (mode.value === 'easy' ? 2 : 5))
const activeBonusMultiplier = ref<number>(BASE_BONUS.value)
watch(mode, () => { activeBonusMultiplier.value = BASE_BONUS.value })

const xpBursts = ref<XpBurst[]>([])
let burstId = 1
function spawnBurst(amount: number) {
    const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
    const id = burstId++
    xpBursts.value.push({ id, text: `+${amount}xp`, side })
    setTimeout(() => {
        xpBursts.value = xpBursts.value.filter(b => b.id !== id)
    }, 2400)
}

/* -------- Derived -------- */
const currentCard = computed<Card | null>(() => {
    if (!order.value.length) return null
    const i = order.value[index.value]
    return allCards.value[i] ?? null
})

const progress = computed(() => {
    const done = index.value
    const total = order.value.length
    return total > 0 ? Math.round((done / total) * 100) : 0
})

const jpLabel = computed(() => {
    const j = currentCard.value?.japanese
    if (!j) return ''
    if (typeof j === 'string') return ''
    return j?.kanji ?? ''
})

/* Group letter slots into words so wrapping only happens between words */
const slotGroups = computed<WordGroup[]>(() => {
    const groups: WordGroup[] = []
    let current: Array<{ index: number; ch: string }> = []
    for (const s of displaySlots.value) {
        if (s.type === 'space') {
            if (current.length) {
                groups.push({ type: 'word', slots: current })
                current = []
            }
            groups.push({ type: 'space' })
        } else {
            current.push({ index: s.index, ch: s.ch })
        }
    }
    if (current.length) groups.push({ type: 'word', slots: current })
    return groups
})

/* -------- Init / Data -------- */
onMounted(async () => {
    try {
        let baseCards: Card[] = []
        if (props.cards?.length) {
            baseCards = props.cards
        } else {
            const qDeckId = (route.query.deckId as string) || (route.params.id as string) || props.deckId
            if (!qDeckId) throw new Error('No cards or deckId provided.')
            baseCards = await fetchDeckCards(qDeckId)
        }

        const usable = baseCards.filter(c => !!c.english?.trim())
        if (!usable.length) throw new Error('No usable cards found for Spelling Blitz.')

        allCards.value = usable
        order.value = shuffle(Array.from(usable.keys()))
        index.value = 0
        prepareWord()
        loading.value = false
        ensureFocusSoon()
    } catch (e: any) {
        error.value = e?.message ?? 'Failed to load cards.'
        loading.value = false
    }
})

async function fetchDeckCards(deckId: string): Promise<Card[]> {
    const { data, error } = await supabase
        .from('v_deck_cards_expanded')
        .select(`
      deck_id,
      card_id,
      english,
      japanese_kanji,
      japanese_furigana,
      image_url,
      audio_url,
      tags,
      card_tags,
      position
    `)
        .eq('deck_id', deckId)
        .order('position', { ascending: true })

    if (error) throw error

    const toPublicUrl = (path?: string | null) => {
        if (!path) return ''
        const { data } = supabase.storage.from('public-assets').getPublicUrl(path)
        return data?.publicUrl ?? ''
    }

    return (data || []).map((r: any) => ({
        id: r.card_id,
        english: r.english ?? '',
        japanese: { kanji: r.japanese_kanji ?? undefined, furigana: r.japanese_furigana ?? undefined },
        image_url: toPublicUrl(r.image_url),
    })) as Card[]
}

/* -------- Word prep (keep spaces visually) -------- */
function prepareWord() {
    allowingInput.value = true
    hintedIndices.value.clear()
    activeBonusMultiplier.value = BASE_BONUS.value

    const card = currentCard.value
    if (!card) return

    // Keep spaces, drop punctuation; collapse multiples
    const raw = (card.english ?? '')
        .replace(/[^A-Za-z ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const lettersOnly = raw.replace(/ /g, '')

    currentWord.value = lettersOnly
    inputLetters.value = Array(lettersOnly.length).fill('')
    hintLetters.value = lettersOnly.split('')

    const slots: Slot[] = []
    let li = 0
    for (const ch of raw) {
        if (ch === ' ') {
            slots.push({ type: 'space' })
        } else if (/[A-Za-z]/.test(ch)) {
            slots.push({ type: 'letter', index: li, ch: lettersOnly[li] })
            li++
        }
    }
    displaySlots.value = slots
    perWordStart.value = performance.now()
}

/* -------- Game flow -------- */
function startGame() {
    started.value = true
    finished.value = false
    showSummary.value = false
    totalXp.value = 0
    perWordResults.value = []
    index.value = 0
    if (!order.value.length) order.value = shuffle(Array.from(allCards.value.keys()))
    prepareWord()
    ensureFocusSoon()
}

function nextCard() {
    index.value++
    if (index.value >= order.value.length) {
        finishRound()
    } else {
        prepareWord()
        ensureFocusSoon()
    }
}

function finishRound() {
    finished.value = true
    allowingInput.value = false
    started.value = false
    // small buffer before showing the summary table
    setTimeout(() => startSummary(), 250)
}

/* -------- Input handling -------- */
function ensureFocusSoon() {
    requestAnimationFrame(() => inputEl.value?.focus({ preventScroll: true }))
}

function onKey(e: KeyboardEvent) {
    if (!allowingInput.value || finished.value) return
    const key = e.key

    if (key === 'Enter' || key === 'Tab') {
        e.preventDefault()
        if (isCorrect()) completeWord()
        return
    }
    if (key === 'Backspace') {
        e.preventDefault()
        backspace()
        return
    }
    if ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === 'k' || key.toLowerCase() === 's')) {
        e.preventDefault()
        skipWord()
        ensureFocusSoon()
        return
    }
    if (/^[a-zA-Z]$/.test(key)) {
        e.preventDefault()
        typeLetter(key)
    }
}

function firstEmptyIndex() {
    for (let i = 0; i < inputLetters.value.length; i++) {
        if (inputLetters.value[i] === '') return i
    }
    return -1
}

function typeLetter(ch: string) {
    const i = firstEmptyIndex()
    if (i === -1) return
    inputLetters.value[i] = ch
    playTypeSfx()
    if (isCorrect()) completeWord()
}

function backspace() {
    for (let i = inputLetters.value.length - 1; i >= 0; i--) {
        if (inputLetters.value[i] !== '') {
            inputLetters.value[i] = ''
            break
        }
    }
}

function isCorrect() {
    if (!currentWord.value.length) return false
    return inputLetters.value.join('').toLowerCase() === currentWord.value.toLowerCase()
}

function skipWord() {
    perWordMs.value = Math.max(0, Math.floor(performance.now() - perWordStart.value))
    const card = currentCard.value!
    perWordResults.value.push({
        cardId: card.id,
        english: currentWord.value,
        letters: currentWord.value.length,
        ms: perWordMs.value,
        xpLetters: 0,
        xpBonus: 0,
        xpTotal: 0
    })
    nextCard()
}

/* Hard-mode hint */
function revealHintLetter() {
    if (mode.value !== 'hard') return
    const i = firstEmptyIndex()
    if (i === -1) return
    inputLetters.value[i] = currentWord.value[i]
    hintedIndices.value.add(i)
    activeBonusMultiplier.value = BASE_BONUS.value
    playTypeSfx()
    if (isCorrect()) completeWord()
    ensureFocusSoon()
}

async function completeWord() {
    allowingInput.value = false
    perWordMs.value = Math.max(1, Math.floor(performance.now() - perWordStart.value))
    const lettersTyped = currentWord.value.length

    const unhintedCount = lettersTyped - hintedIndices.value.size
    const perLetterXp = Math.max(0, unhintedCount) * XP_PER_LETTER.value

    const seconds = perWordMs.value / 1000
    const speed = lettersTyped / Math.max(0.5, seconds)
    const xpBonus = Math.max(0, Math.round(speed * activeBonusMultiplier.value))
    const wordTotal = perLetterXp + xpBonus

    const isLast = index.value >= order.value.length - 1
    const delay = isLast ? 650 : 220

    playCompleteSfx()

    await safeAwardXp(perLetterXp, 'spelling_blitz', {
        reason: 'letters', mode: mode.value, cardId: currentCard.value?.id,
        english: currentWord.value, ms: perWordMs.value
    })
    await safeAwardXp(xpBonus, 'spelling_blitz', {
        reason: 'completion_bonus', mode: mode.value, cardId: currentCard.value?.id,
        english: currentWord.value, ms: perWordMs.value
    })

    totalXp.value += wordTotal
    perWordResults.value.push({
        cardId: currentCard.value!.id,
        english: currentWord.value,
        letters: lettersTyped,
        ms: perWordMs.value,
        xpLetters: perLetterXp,
        xpBonus,
        xpTotal: wordTotal
    })

    spawnBurst(wordTotal)

    setTimeout(() => {
        allowingInput.value = true
        nextCard()
    }, delay)
}

/* -------- XP Ledger -------- */
async function safeAwardXp(amount: number, source: string, meta: Record<string, any>) {
    try {
        if (amount <= 0) return
        await awardXp(amount, source, meta)
    } catch { }
}

async function awardXp(amount: number, source: string, meta: Record<string, any>) {
    // Do nothing yet
}

/* -------- Settings -------- */
const showSettings = ref(false)
function toggleSettings() { showSettings.value = !showSettings.value; ensureFocusSoon() }
function closeSettings() { showSettings.value = false; ensureFocusSoon() }
function endGameNow() { closeSettings(); finishRound() }
function restartGame() { closeSettings(); startGame() }

/* -------- Utils -------- */
function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}
function goBack() { router.back() }


// --- Summary table state (no total-xp animation) ---
const summaryRows = ref<Array<{
    cardId: UUID
    english: string
    letters: number
    ms: number
    xpLetters: number
    xpBonus: number
    xpTotal: number
}>>([])

async function startSummary() {
  showSummary.value = true

  // 1) Stagger table rows in
  summaryRows.value = []
  const rows = perWordResults.value.slice()
  let i = 0
  const rowTimer = window.setInterval(() => {
    if (i >= rows.length) {
      clearInterval(rowTimer)
      return
    }
    summaryRows.value.push(rows[i++])
  }, 150)

  // 2) After table is shown, open UserLevels and split XP: 80% Writing, 20% Reading
  await nextTick()
  window.setTimeout(() => {
    const total = totalXp.value
    if (total <= 0) return
    const writing = Math.round(total * 0.8)
    const reading = total - writing

    levelsRef.value?.open()
    levelsRef.value?.addReadingXp(reading)
    levelsRef.value?.addWritingXp(writing)
  }, 400)
}
</script>

<template>
    <div class="sb-page" @click.self="ensureFocusSoon()">
        <!-- Back -->
        <button class="back-btn" type="button" @click="goBack" title="Back">← Back</button>

        <header class="sb-head">
            <div class="left">
                <h1 class="title">Spelling Blitz</h1>
            </div>

            <div class="right">
                <div class="stat"><span class="k">XP</span><span class="v">{{ totalXp }}</span></div>
                <div class="stat"><span class="k">Progress</span><span class="v">{{ progress }}%</span></div>

                <!-- Moved: End Game button to the top bar -->
                <button
                  v-if="started"
                  class="btn danger"
                  @click="endGameNow"
                  title="End Game"
                >
                  ⏹ End Game
                </button>

                <button v-if="started" class="btn settings-btn" :aria-expanded="showSettings" @click="toggleSettings">
                    ⚙ Settings
                </button>
            </div>
        </header>

        <main class="sb-main">
            <p v-if="loading" class="muted">Loading cards…</p>
            <p v-else-if="error" class="error">{{ error }}</p>

            <section v-else class="arena" @click="ensureFocusSoon">
                <!-- Progress -->
                <div class="progress-bar" role="progressbar" :aria-valuenow="progress" aria-valuemin="0"
                    aria-valuemax="100">
                    <div class="bar" :style="{ width: progress + '%' }"></div>
                </div>

                <!-- Multiplier chip below the bar -->
                <div class="multiplier-row">
                    <div class="multiplier-chip" :key="activeBonusMultiplier">
                        x{{ activeBonusMultiplier }}
                    </div>
                </div>

                <!-- START SCREEN -->
                <div v-if="!started && !showSummary" class="start-screen">
                    <div class="mode-select">
                        <button class="mode-big" :class="{ active: mode === 'easy' }"
                            @click="mode = 'easy'; activeBonusMultiplier = BASE_BONUS; ensureFocusSoon()"
                            :aria-pressed="mode === 'easy'">
                            Easy
                        </button>
                        <button class="mode-big" :class="{ active: mode === 'hard' }"
                            @click="mode = 'hard'; activeBonusMultiplier = BASE_BONUS; ensureFocusSoon()"
                            :aria-pressed="mode === 'hard'">
                            Hard
                        </button>
                    </div>
                    <button class="btn start-big" @click="startGame">Start</button>
                </div>

                <!-- ACTIVE ROUND -->
                <div v-else-if="started && currentCard" class="card-area" @click="ensureFocusSoon">
                    <figure class="image-wrap">
                        <!-- JP label on its own row, bigger + gray; no overlap -->
                        <div v-if="jpLabel" class="jp-title">{{ jpLabel }}</div>
                        <div class="img-cell">
                            <img :src="currentCard.image_url || ''" :alt="currentCard.english"
                                @error="(e: any) => e.target.style.visibility = 'hidden'" />
                        </div>
                    </figure>

                    <!-- Floating XP bursts -->
                    <transition-group name="burst" tag="div" class="bursts">
                        <div v-for="b in xpBursts" :key="b.id" class="burst" :class="b.side">
                            {{ b.text }}
                        </div>
                    </transition-group>

                    <div class="word-wrap">
                        <!-- Wrap only between words -->
                        <div class="boxes" @click="ensureFocusSoon">
                            <template v-for="(g, gi) in slotGroups" :key="gi">
                                <div v-if="g.type === 'word'" class="word-group">
                                    <div v-for="slot in g.slots" :key="slot.index" class="box" :class="{
                                        filled: inputLetters[slot.index] !== '',
                                        correct: inputLetters[slot.index] !== '' &&
                                            inputLetters[slot.index]?.toLowerCase() === slot.ch.toLowerCase(),
                                        incorrect: inputLetters[slot.index] !== '' &&
                                            inputLetters[slot.index]?.toLowerCase() !== slot.ch.toLowerCase(),
                                    }">
                                        <span class="user">{{ inputLetters[slot.index] }}</span>
                                        <span v-if="mode === 'easy' && inputLetters[slot.index] === ''" class="hint">
                                            {{ slot.ch.toUpperCase() }}
                                        </span>
                                    </div>
                                </div>
                                <div v-else class="space-gap" aria-hidden="true"></div>
                            </template>
                        </div>

                        <input ref="inputEl" class="hidden-input" type="text" @keydown="onKey" autocomplete="off"
                            autocapitalize="none" spellcheck="false" aria-label="Type the word" />

                        <div class="controls">
                            <button class="btn hint" @click="revealHintLetter(); ensureFocusSoon()"
                                :disabled="mode !== 'hard'">Hint</button>
                            <button class="btn" @click="skipWord(); ensureFocusSoon()"
                                :disabled="!started">Skip</button>
                            <button class="btn success" @click="isCorrect() && completeWord(); ensureFocusSoon()"
                                :disabled="!isCorrect()">Confirm</button>
                        </div>

                        <p class="mini">
                            Per-letter XP: <strong>{{ XP_PER_LETTER }}</strong> &nbsp;•&nbsp;
                            Speed bonus multiplier: <strong>x{{ activeBonusMultiplier }}</strong>
                        </p>
                    </div>
                </div>

                <!-- SUMMARY -->
                <div v-else-if="showSummary" class="summary">
                    <!-- (Removed big total-xp counter by request) -->

                    <table class="results">
                        <thead>
                            <tr>
                                <th>Word</th>
                                <th>Letters</th>
                                <th>Time (s)</th>
                                <th>Letters XP</th>
                                <th>Bonus XP</th>
                                <th>Total</th>
                            </tr>
                        </thead>

                        <!-- Grow rows as they are added -->
                        <transition-group name="rowgrow" tag="tbody">
                            <tr v-for="r in summaryRows" :key="r.cardId + r.ms">
                                <td>{{ r.english }}</td>
                                <td class="tc">{{ r.letters }}</td>
                                <td class="tc">{{ (r.ms / 1000).toFixed(2) }}</td>
                                <td class="tc">{{ r.xpLetters }}</td>
                                <td class="tc">{{ r.xpBonus }}</td>
                                <td class="tc">{{ r.xpTotal }}</td>
                            </tr>
                        </transition-group>
                    </table>

                    <div class="summary-actions">
                        <button class="btn primary" @click="startGame">Play Again</button>
                    </div>
                </div>

            </section>
        </main>

        <!-- Settings overlay -->
        <div v-if="showSettings" class="settings-overlay" @click.self="closeSettings">
            <div class="settings-panel" role="dialog" aria-modal="true">
                <h3>Settings</h3>
                <div class="row">
                    <span>Difficulty</span>
                    <div class="seg">
                        <button class="seg-btn" :class="{ active: mode === 'easy' }"
                            @click="mode = 'easy'; activeBonusMultiplier = BASE_BONUS; closeSettings()">Easy</button>
                        <button class="seg-btn" :class="{ active: mode === 'hard' }"
                            @click="mode = 'hard'; activeBonusMultiplier = BASE_BONUS; closeSettings()">Hard</button>
                    </div>
                </div>
                <div class="row">
                    <button class="btn" @click="restartGame">Restart</button>
                    <!-- End Game moved to top bar -->
                    <button class="btn" @click="closeSettings">Close</button>
                </div>
            </div>
        </div>

        <!-- Levels popup -->
        <UserLevels ref="levelsRef" :overlay="true" />
    </div>
</template>

<style scoped>
/* Page */
.sb-page {
    min-height: 100dvh;
    padding: 24px;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 16px;
    background: radial-gradient(1200px 700px at 50% -10%, #1f2937 0%, #0e1726 55%, #070c15 100%);
    color: #e5e7eb;
}

/* Header layout */
.sb-head,
.arena {
    width: min(80vw, 1100px);
    margin-inline: auto;
}

.sb-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.title {
    font-size: 1.4rem;
    font-weight: 700;
}

.right {
    display: flex;
    align-items: center;
    gap: 12px;
}

.stat {
    display: grid;
    place-items: center;
    min-width: 72px;
    padding: 6px 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
}

.stat .k {
    font-size: .75rem;
    opacity: .8;
}

.stat .v {
    font-weight: 800;
}

/* Back button + hover */
.back-btn {
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 10;
    background: #fff;
    color: #111;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    padding: 8px 12px;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, .15);
    transition: transform .12s ease;
}

.back-btn:hover {
    transform: scale(1.05);
}

/* Buttons */
.btn {
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: #111827;
    color: #f8fafc;
    cursor: pointer;
    transition: transform .12s ease, box-shadow .12s ease, background-color .12s ease;
}

.btn:hover {
    transform: translateZ(0) scale(1.03);
    box-shadow: 0 8px 14px rgba(0, 0, 0, .25);
}

.btn[disabled] {
    opacity: .5;
    cursor: default;
}

.btn.primary {
    background: #2dd4bf;
    color: #0b1020;
    border-color: transparent;
}

.btn.success {
    background: #22c55e;
    border-color: #22c55e;
    color: #04120a;
}

.btn.danger {
    background: #b91c1c;
    border-color: #b91c1c;
}

.settings-btn {
    background: #0f172a;
}

/* Main */
.sb-main {
    display: grid;
    align-items: start;
}

.muted {
    opacity: .8;
}

.error {
    color: #ff7070;
}

.arena {
    display: grid;
    gap: 14px;
}

/* Progress */
.progress-bar {
    height: 10px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    overflow: hidden;
}

.progress-bar .bar {
    height: 100%;
    width: 0%;
    transition: width .25s ease;
    background: linear-gradient(90deg, #22c55e, #2dd4bf);
}

/* Multiplier below the bar */
.multiplier-row {
    display: flex;
    justify-content: flex-end;
}

.multiplier-chip {
    background: #111827;
    border: 1px solid rgba(255, 255, 255, .14);
    color: #f0fdf4;
    padding: 6px 10px;
    border-radius: 999px;
    font-weight: 800;
    animation: pop .25s ease;
}

/* Start screen */
.start-screen {
    display: grid;
    place-items: center;
    gap: 18px;
    padding: 24px 0;
}

.mode-select {
    display: flex;
    gap: 14px;
}

.mode-big {
    min-width: 160px;
    min-height: 68px;
    font-size: 1.2rem;
    font-weight: 800;
    background: #0b1220;
    border: 1px solid rgba(255, 255, 255, .14);
    color: #e5e7eb;
    border-radius: 12px;
    transition: transform .12s ease, background-color .12s ease, box-shadow .12s ease;
}

.mode-big.active {
    background: #2dd4bf;
    color: #0b1020;
    border-color: transparent;
}

.mode-big:hover {
    transform: scale(1.05);
    box-shadow: 0 10px 20px rgba(0, 0, 0, .35);
}

.start-big {
    font-size: 1.1rem;
    padding: 14px 22px;
}

/* Card area */
.card-area {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
}

/* Image card (grid: jp label + image) */
.image-wrap {
    width: clamp(240px, 34vw, 460px);
    aspect-ratio: 1 / 1;
    border-radius: 14px;
    border: 1px solid rgba(0, 0, 0, .08);
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(0, 0, 0, .28);
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
}

.jp-title {
    padding: 8px 10px 4px;
    text-align: center;
    color: #6b7280;
    font-weight: 900;
    font-size: 1.18rem;
    letter-spacing: .5px;
}

.img-cell {
    display: grid;
    place-items: center;
    padding: 6px 8px 10px;
}

.image-wrap img {
    max-width: 92%;
    max-height: 92%;
    object-fit: contain;
}

/* XP bursts */
.bursts {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.burst {
    position: absolute;
    top: 55%;
    font-weight: 900;
    background: rgba(45, 212, 191, .12);
    color: #22c55e;
    border: 1px solid rgba(45, 212, 191, .3);
    padding: 6px 10px;
    border-radius: 10px;
    animation-duration: 1.05s;
    animation-fill-mode: forwards;
    opacity: 0;
    text-shadow:
        0 0 10px rgba(34, 197, 94, 0.85),
        0 0 4px rgba(34, 197, 94, 0.6);
}

.burst.left {
    left: 16%;
    animation-name: floatLeft;
}

.burst.right {
    right: 16%;
    animation-name: floatRight;
}

@keyframes floatLeft {
    0% {
        opacity: 0;
        transform: translateY(0) scale(0.96);
    }
    12% {
        opacity: 1;
        transform: translateY(-6px) scale(1);
    }
    70% {
        opacity: 1;
        transform: translateY(-26px) scale(1.03);
    }
    100% {
        opacity: 0;
        transform: translateY(-44px) scale(1.06);
    }
}

@keyframes floatRight {
    0% {
        transform: translate(8px, 10px) scale(.92);
        opacity: 0;
    }
    10% { opacity: 1; }
    100% {
        transform: translate(22px, -36px) scale(1.08);
        opacity: 0;
    }
}

/* Word area */
.word-wrap {
    width: 100%;
    display: grid;
    gap: 12px;
    place-items: center;
}

/* OUTER: wraps only between word groups */
.boxes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px 18px;
    width: 100%;
}

/* INNER: a single word does not wrap */
.word-group {
    display: inline-flex;
    flex-wrap: nowrap;
    gap: 12px;
}

/* Letter boxes */
.box {
    position: relative;
    height: 68px;
    width: clamp(46px, 4.8vw, 60px);
    border: 2px solid #cbd5e1;
    border-radius: 12px;
    display: grid;
    place-items: center;
    font-weight: 900;
    font-size: clamp(1.1rem, 1.5vw, 1.6rem);
    letter-spacing: .5px;
    background: #f3f4f6;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .06);
    transition: background-color .12s ease, border-color .12s ease;
}

.box .user {
    position: relative;
    z-index: 2;
    color: #111;
}

.box .hint {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 900;
    letter-spacing: 1px;
    color: #9ca3af;
    opacity: .85;
    user-select: none;
}

/* Feedback states */
.box.filled { border-color: #94a3b8; }
.box.correct { background: #d1fae5; border-color: #34d399; }
.box.incorrect { background: #fee2e2; border-color: #f87171; }

/* Visual space between words */
.space-gap {
    width: clamp(24px, 3vw, 32px);
    height: 68px;
}

/* Hidden input */
.hidden-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 0;
    height: 0;
}

/* Controls + hover highlight */
.controls {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.btn.hint { background: #0b1220; }

.controls .btn:hover { transform: scale(1.05); }

/* Summary */
.summary {
    display: grid;
    gap: 12px;
}

.results {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid rgba(255, 255, 255, .14);
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, .03);
}

.results thead th {
    background: rgba(255, 255, 255, .08);
    color: #e5e7eb;
}

.results th,
.results td {
    border-bottom: 1px solid rgba(255, 255, 255, .12);
    padding: 10px 12px;
}

.results .tc { text-align: center; }

.summary-actions { margin-top: 8px; }

/* Settings overlay */
.settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .45);
    display: grid;
    place-items: center;
    z-index: 20;
}

.settings-panel {
    width: min(92vw, 460px);
    background: #0b1220;
    color: #e5e7eb;
    border: 1px solid rgba(255, 255, 255, .14);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, .35);
}

.settings-panel h3 { margin: 0 0 12px; }

.settings-panel .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 10px 0;
}

.seg {
    display: inline-flex;
    border: 1px solid rgba(255, 255, 255, .14);
    border-radius: 10px;
    overflow: hidden;
}

.seg-btn {
    background: #111827;
    color: #e5e7eb;
    padding: 8px 14px;
    border: none;
    cursor: pointer;
    transition: background-color .12s ease, transform .12s ease;
}

.seg-btn:hover { transform: scale(1.03); }

.seg-btn.active {
    background: #2dd4bf;
    color: #0b1020;
}

/* Table rows grow in as they're appended */
.rowgrow-enter-from {
    transform: scaleY(0.8);
    opacity: 0;
}
.rowgrow-enter-active {
    transform-origin: top;
    transition: transform .18s ease, opacity .18s ease;
}
.rowgrow-enter-to {
    transform: scaleY(1);
    opacity: 1;
}

/* Animations */
@keyframes pop {
    0% { transform: scale(.9); }
    100% { transform: scale(1); }
}

/* Mobile */
@media (max-width: 600px) {
    .box {
        height: 58px;
        width: 46px;
    }
    .space-gap { height: 58px; }
    .image-wrap { width: min(76vw, 400px); }
}
</style>
