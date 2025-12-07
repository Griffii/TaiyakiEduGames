<!-- src/views/HeadsUp.vue -->
<template>
  <section class="headsup-page">
    <!-- Back -->
    <button class="home-button" type="button" @click="onExit" aria-label="Back">
      <img :src="homeIcon" alt="" />
    </button>

    <!-- Settings -->
    <button
      class="settings-button"
      type="button"
      @click="toggleSettingsMenu"
      aria-haspopup="dialog"
      :aria-expanded="showSettings"
      aria-controls="settings-menu"
      ref="settingsBtnRef"
    >
      <img :src="settingsIcon" alt="" />
    </button>

    <!-- Top bar: timer + score -->
    <div class="topbar">
      <div class="timer" aria-live="polite">{{ secondsLeft }}</div>
      <!-- <div class="score">Score: <strong>{{ score }}</strong></div> -->
    </div>

    <!-- Big Card (card clicks do NOT progress) -->
    <div
      class="flashcard-container"
      :class="{ 'image-hidden': !showImage, 'japanese-hidden': !showJapanese }"
      role="group"
      :aria-label="ariaCardLabel"
    >
      <div class="card-content">
        <div class="image-container" v-if="showImage">
          <img :src="currentImage" :alt="currentEnglish || 'Card image'" />
        </div>

        <!-- Japanese: plain stacked text (furigana over kanji) -->
        <div class="japanese-container" v-if="showJapanese">
          <div class="jp-stack">
            <div v-if="currentFurigana" class="jp-furi">{{ currentFurigana }}</div>
            <div v-if="currentKanji" class="jp-kanji">{{ currentKanji }}</div>
            <div v-else-if="!currentKanji && currentJapanese" class="jp-fallback">{{ currentJapanese }}</div>
          </div>
        </div>
      </div>

      <!-- English banner -->
      <div class="english-container" v-if="showEnglish">
        <div class="english">{{ currentEnglish }}</div>
      </div>
    </div>

    <!-- Buttons -->
    <div class="buttons-container">
      <button class="pass-btn" type="button" @click="onPass">Pass</button>
      <button class="get-btn" type="button" @click="onGet">Get</button>
    </div>

    <!-- Backdrop to close settings on outside click -->
    <div v-show="showSettings" class="settings-backdrop"  />

    <!-- Settings Menu -->
    <div
      id="settings-menu"
      class="settings-menu"
      v-show="showSettings"
      role="dialog"
      :aria-modal="false"
      :aria-hidden="!showSettings"
      @click.stop
      ref="settingsMenuRef"
    >
      <h3>Settings</h3>

      <button class="toggle-btn" @click="showImage = !showImage">
        {{ showImage ? 'Hide Image' : 'Show Image' }}
      </button>

      <button id="toggle-japanese-btn" class="toggle-btn" @click="showJapanese = !showJapanese">
        {{ showJapanese ? 'Hide Japanese' : 'Show Japanese' }}
      </button>

      <button id="toggle-english-btn" class="toggle-btn" @click="showEnglish = !showEnglish">
        {{ showEnglish ? 'Hide English' : 'Show English' }}
      </button>

      <button class="restart-btn" @click="restartGame">Restart Game</button>
      <button class="end-game-btn" @click="endGame">End Game</button>
    </div>

    <!-- Backdrop for Game Over modal -->
    <div v-if="showScoreModal" class="settings-backdrop" aria-hidden="true" />

    <!-- Final Score Modal -->
    <div class="score-screen" :class="{ show: showScoreModal }" v-if="showScoreModal">
      <h1>Game Over!</h1>
      <p class="your-score-label">Your Score:</p>
      <div class="final-score">{{ score }}</div>
      <div class="score-actions">
        <button class="play-again" @click="restartGame">Play Again</button>
        <button class="back-deck" @click="goToDeckViewer">Back to Deck</button>
      </div>
    </div>

    <!-- SFX -->
    <audio ref="timeUpRef" :src="timeUpSrc"></audio>
    <audio ref="correctRef" :src="correctSrc"></audio>
    <audio ref="passRef" :src="passSrc"></audio>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameTransitStore, type Flashcard as TransitCard } from '@/stores/gameTransit'

interface GameCard extends TransitCard {}

const router = useRouter()
const transit = useGameTransitStore()

/** Storage keys */
const STORAGE_PREFIX = 'headsup.'
const K = {
  showImage: STORAGE_PREFIX + 'showImage',
  showEnglish: STORAGE_PREFIX + 'showEnglish',
  showJapanese: STORAGE_PREFIX + 'showJapanese',
  pool: STORAGE_PREFIX + 'lastPool',
}

/** Props */
const props = withDefaults(
  defineProps<{
    cards?: TransitCard[]
    durationSeconds?: number
  }>(),
  { durationSeconds: 60 }
)

/** Settings state */
const showSettings = ref(false)
const settingsBtnRef = ref<HTMLElement | null>(null)
const settingsMenuRef = ref<HTMLElement | null>(null)

const showImage = ref(loadBool(K.showImage, true))
const showEnglish = ref(loadBool(K.showEnglish, true))
const showJapanese = ref(loadBool(K.showJapanese, true))

/** Game state */
const deck = ref<GameCard[]>([])
const discard = ref<GameCard[]>([])
const current = ref<GameCard | null>(null)
const score = ref(0)

/** Timer */
const secondsLeft = ref(props.durationSeconds)
const timerId = ref<number | null>(null)
const endAt = ref<number | null>(null)       // timestamp when time should end
const remainingMs = ref(props.durationSeconds * 1000) // remaining ms when paused/resumed

/** Modal */
const showScoreModal = ref(false)

/** SFX */
const timeUpSrc = new URL('@/assets/sounds/stop_waitaminute.mp3', import.meta.url).toString()
const correctSrc = new URL('@/assets/sounds/fortunegame/chukichi.mp3', import.meta.url).toString()
const passSrc = new URL('@/assets/sounds/fortunegame/shokichi.mp3', import.meta.url).toString()
const timeUpRef = ref<HTMLAudioElement | null>(null)
const correctRef = ref<HTMLAudioElement | null>(null)
const passRef = ref<HTMLAudioElement | null>(null)

/** Icons */
const homeIcon = new URL('@/assets/images/icons/back-icon.png', import.meta.url).toString()
const settingsIcon = new URL('@/assets/images/icons/settings-icon.png', import.meta.url).toString()

/** Card source */
const sourceCards = computed<TransitCard[]>(() => (props.cards?.length ? props.cards : transit.cards))

/** Current card fields */
const currentEnglish = computed(() => current.value?.english ?? '')
const currentImage = computed(() => current.value?.image_url ?? '')

/* Prefer explicit fields; support nested shape; fallback to plain string */
const currentKanji = computed(() => {
  const c: any = current.value || {}
  if (typeof c.kanji === 'string') return c.kanji
  if (c.japanese && typeof c.japanese === 'object' && typeof c.japanese.kanji === 'string') return c.japanese.kanji
  if (typeof c.japanese === 'string') return c.japanese
  return ''
})
const currentFurigana = computed(() => {
  const c: any = current.value || {}
  if (typeof c.furigana === 'string') return c.furigana
  if (c.japanese && typeof c.japanese === 'object' && typeof c.japanese.furigana === 'string') return c.japanese.furigana
  if (typeof c.kana === 'string') return c.kana
  return ''
})
const currentJapanese = computed(() => {
  const c: any = current.value || {}
  if (typeof c.japanese === 'string') return c.japanese
  return ''
})

const ariaCardLabel = computed(() => {
  const parts: string[] = []
  if (showJapanese.value) {
    const jpBits = [currentFurigana.value, currentKanji.value].filter(Boolean).join(' / ')
    if (jpBits) parts.push(jpBits)
    else if (currentJapanese.value) parts.push(currentJapanese.value)
  }
  if (showEnglish.value && currentEnglish.value) parts.push(currentEnglish.value)
  return parts.join(' — ')
})

/* ====== Pause/Resume management ====== */
const pauseReasons = new Set<string>() // e.g., 'settings', 'hidden', 'modal'

function startTimer() {
  stopTimer()
  remainingMs.value = props.durationSeconds * 1000
  endAt.value = Date.now() + remainingMs.value
  tick()
  timerId.value = window.setInterval(tick, 200)
}
function tick() {
  if (!endAt.value) return
  const msLeft = Math.max(0, endAt.value - Date.now())
  remainingMs.value = msLeft
  secondsLeft.value = Math.ceil(msLeft / 1000)
  if (msLeft <= 0) {
    stopTimer()
    onTimeUp()
  }
}
function stopTimer() {
  if (timerId.value != null) {
    clearInterval(timerId.value)
    timerId.value = null
  }
}
function pauseTimer(reason: string) {
  if (pauseReasons.has(reason)) return
  pauseReasons.add(reason)
  if (endAt.value) {
    remainingMs.value = Math.max(0, endAt.value - Date.now())
    endAt.value = null
  }
  stopTimer()
}
function resumeTimer(reason: string) {
  // remove this reason and resume only if no reasons remain
  pauseReasons.delete(reason)
  if (pauseReasons.size > 0 || showScoreModal.value) return
  if (remainingMs.value <= 0) return
  if (!endAt.value) {
    endAt.value = Date.now() + remainingMs.value
    tick()
    timerId.value = window.setInterval(tick, 200)
  }
}

/** Lifecycle */
onMounted(() => {
  bootstrapGame()
  startTimer()

  window.addEventListener('pointerdown', handleGlobalPointerDown, true)
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('visibilitychange', onVisibility)
})
onUnmounted(() => {
  stopTimer()
  window.removeEventListener('pointerdown', handleGlobalPointerDown, true)
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('visibilitychange', onVisibility)
})

watch([showImage, showEnglish, showJapanese], persistSettings, { deep: true })

// Pause/resume when settings open/close
watch(showSettings, (open) => {
  if (open) pauseTimer('settings')
  else resumeTimer('settings')
})

// Pause when modal is shown
watch(showScoreModal, (open) => {
  if (open) pauseTimer('modal')
  else resumeTimer('modal')
})

function onVisibility() {
  if (document.hidden) pauseTimer('hidden')
  else resumeTimer('hidden')
}

/** Game bootstrap */
function bootstrapGame() {
  const pool = (sourceCards.value && sourceCards.value.length ? sourceCards.value : loadPool()) ?? []
  if (pool.length) {
    deck.value = shuffle(pool.slice())
    discard.value = []
    current.value = deck.value.shift() ?? null
    savePool(pool)
  } else {
    deck.value = []
    current.value = null
  }
  score.value = 0
  secondsLeft.value = props.durationSeconds
  remainingMs.value = props.durationSeconds * 1000
  showScoreModal.value = false
  pauseReasons.clear()
}

/** Actions — only buttons progress */
function onGet() {
  if (!current.value) return
  score.value += 1
  correctRef.value?.play().catch(() => {})
  discard.value.push(current.value)
  advanceToNext()
}
function onPass() {
  if (!current.value) return
  passRef.value?.play().catch(() => {})
  deck.value.push(current.value) // send to bottom
  advanceToNext()
}
function advanceToNext() {
  current.value = deck.value.shift() ?? null
  if (!current.value && discard.value.length) {
    deck.value = shuffle(discard.value.splice(0))
    current.value = deck.value.shift() ?? null
  }
}

/** End / Restart / Navigation */
function onTimeUp() {
  timeUpRef.value?.play().catch(() => {})
  showScoreModal.value = true
}
function restartGame() {
  bootstrapGame()
  startTimer()
  showSettings.value = false
}
function endGame() {
  stopTimer()
  showScoreModal.value = true
}
function goToDeckViewer() { onExit() }
function onExit() { try { router.back() } catch {} }

/** Settings menu logic */
function toggleSettingsMenu() { showSettings.value = !showSettings.value }
function handleGlobalPointerDown(e: PointerEvent) {
  if (!showSettings.value) return
  const t = e.target as Node
  if (settingsMenuRef.value?.contains(t)) return
  if (settingsBtnRef.value?.contains(t)) return
  showSettings.value = false
}
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showSettings.value) showSettings.value = false
}

/** Storage helpers */
function persistSettings() {
  saveBool(K.showImage, showImage.value)
  saveBool(K.showEnglish, showEnglish.value)
  saveBool(K.showJapanese, showJapanese.value)
}
type MinimalCard = Pick<TransitCard, 'id' | 'english' | 'image_url'> & Record<string, any>
function savePool(pool: TransitCard[]) {
  try {
    const slim: MinimalCard[] = pool.map((c: any) => ({
      id: c.id, english: c.english, image_url: c.image_url,
      kanji: c.kanji, furigana: c.furigana, japanese: c.japanese, kana: c.kana
    }))
    sessionStorage.setItem(K.pool, JSON.stringify(slim))
  } catch {}
}
function loadPool(): TransitCard[] | null {
  try {
    const raw = sessionStorage.getItem(K.pool)
    return raw ? (JSON.parse(raw) as MinimalCard[]) : null
  } catch { return null }
}
function loadBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key)
  return raw == null ? fallback : raw === 'true'
}
function saveBool(key: string, val: boolean) {
  localStorage.setItem(key, String(val))
}

/** Utils */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
</script>

<style scoped>
/* Page */
.headsup-page {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans";
  min-height: 100vh;
  padding: 20px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  align-items: start;
  justify-items: center;
  gap: 16px;
}

/* Buttons (Back / Settings) */
.home-button,
.settings-button {
  position: fixed;
  top: 20px;
  width: 38px;
  height: 38px;
  z-index: 3100;
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
.home-button img, .settings-button img {
  width: 100%;
  height: auto;
  transition: transform .2s ease-in-out;
}
.home-button img:hover { transform: scale(1.08); }
.settings-button:hover img { transform: scale(1.08) rotate(6deg); }

/* --- Settings backdrop (also used for Game Over modal) — THEME TOKENS --- */
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  -webkit-backdrop-filter: var(--modal-overlay-filter);
  z-index: 1200;
}

/* Top bar */
.topbar { display: flex; align-items: center; gap: 24px; margin-top: 10px; }
/* White timer text with black outline */
.timer {
  font-size: 42px;
  font-weight: 900;
  color: #ffffff;
  text-shadow:
    -1px -1px 0 #000,
     1px -1px 0 #000,
    -1px  1px 0 #000,
     1px  1px 0 #000,
     0   -2px 0 #000,
     0    2px 0 #000,
    -2px  0   0 #000,
     2px  0   0 #000;
}
.score { font-size: 24px; font-weight: 800; color: #0b4a43; }

/* Flashcard */
.flashcard-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: min(92vw, 1000px);
  height: 72vh;
  background: #fff;
  border-radius: 12px;
  box-shadow: 2px 2px 12px rgba(0,0,0,.18);
  overflow: hidden;
  user-select: none;
}
.card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px;
  gap: 18px;
  flex: 1 1 auto;
  flex-wrap: wrap;
}
.image-container { flex: 1 1 45%; display: flex; align-items: center; justify-content: center; }
.image-container img { max-width: 100%; max-height: 32vh; object-fit: contain; }

/* Japanese: stacked plain text */
.japanese-container { flex: 1 1 45%; display: grid; place-items: center; text-align: center; color: #111827; }
.jp-stack { display: grid; gap: 8px; width: 100%; max-width: 520px; }
.jp-furi   { font-size: clamp(16px, 3.2vw, 28px); color: #374151; font-weight: 900; line-height: 1.1; }
.jp-kanji  { font-size: clamp(32px, 6.5vw, 80px); color: #111827; font-weight: 900; line-height: 1.1; }
.jp-fallback { font-size: clamp(28px, 6vw, 72px); font-weight: 900; }

/* English banner */
.english-container { width: 100%; background: #cfe8ff; display: grid; place-items: center; padding: 10px; flex-shrink: 0; }
.english { font-family: "Comic Sans MS", system-ui; font-weight: 900; color: #1b3b6f; font-size: clamp(22px, 5vw, 56px); }

/* Hide toggles */
.image-hidden .image-container { display: none; }
.japanese-hidden .japanese-container { display: none; }

/* Actions */
.buttons-container { display: flex; gap: 18px; margin-top: 8px; }
.pass-btn, .get-btn {
  color: #fff;
  border-radius: 12px;
  padding: 16px;
  font-size: clamp(18px, 3.2vw, 36px);
  cursor: pointer;
  width: min(40vw, 260px);
  transition: transform .12s ease-in-out, filter .2s ease-in-out, box-shadow .12s ease-in-out;
  box-shadow: 0 2px 0 rgba(0,0,0,.12);
}
/* Brighter borders */
.pass-btn { background: #e11d48; border: 3px solid #fb7185; } /* rose-600 bg, rose-400 border */
.get-btn  { background: #16a34a; border: 3px solid #34d399; } /* green-600 bg, green-400 border */
.pass-btn:hover, .get-btn:hover { transform: scale(1.04); filter: brightness(.96); }

/* ===== Settings menu (match Bomb/Sharknado theme) ===== */
.settings-menu {
  position: fixed;
  top: 66px;
  right: 20px;
  z-index: 3000;
  width: 240px;
  text-align: center;
  align-items: stretch;

  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);

  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.settings-menu h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--modal-on-surface);
}

/* Menu buttons — base + gradient accents like Bomb Game */
.settings-menu .toggle-btn,
.settings-menu .restart-btn,
.settings-menu .end-game-btn {
  display: block;
  width: 100%;
  padding: 10px 12px;
  font-weight: 800;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transform: translateZ(0);
  transition: transform .12s ease, filter .15s ease, box-shadow .12s ease;
  box-shadow: var(--elevation-1);
  border: 1px solid transparent; /* no extra borders; gradient provides depth */
}

/* Toggle (primary accent) */
.settings-menu .toggle-btn {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-primary) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-primary) 70%, #000 30%) 85%
    );
  color: var(--btn-primary-on);
  border-color: color-mix(in srgb, var(--accent-primary) 65%, #000 35%);
}

/* Restart (secondary accent) */
.settings-menu .restart-btn {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-secondary) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-secondary) 70%, #000 30%) 85%
    );
  color: var(--btn-secondary-on);
  border-color: color-mix(in srgb, var(--accent-secondary) 65%, #000 35%);
}

/* End Game (danger accent) */
.settings-menu .end-game-btn {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-danger) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-danger) 70%, #000 30%) 85%
    );
  color: var(--btn-danger-on);
  border-color: color-mix(in srgb, var(--accent-danger) 65%, #000 35%);
}

/* Hover/active/focus */
.settings-menu .toggle-btn:hover,
.settings-menu .restart-btn:hover,
.settings-menu .end-game-btn:hover { transform: scale(1.03); }
.settings-menu .toggle-btn:active,
.settings-menu .restart-btn:active,
.settings-menu .end-game-btn:active { transform: scale(0.99); }
.settings-menu .toggle-btn:focus-visible,
.settings-menu .restart-btn:focus-visible,
.settings-menu .end-game-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* ===== Score modal uses theme modal tokens ===== */
.score-screen {
  position: fixed;
  top: 50%;
  left: 50%;
  width: min(90vw, 420px);
  transform: translate(-50%, -50%);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  padding: 22px;
  z-index: 3500;
  display: none;
  text-align: center;
  animation: fadeIn .35s ease both;
}
.score-screen.show { display: block; }
.score-screen h1 { font-size: 36px; color: var(--modal-on-surface); margin: 0 0 8px; }
.your-score-label { font-size: 20px; font-weight: 800; color: var(--modal-on-surface); margin: 6px 0 4px; }
.final-score { font-size: 56px; font-weight: 900; color: var(--modal-on-surface); line-height: 1; }
.score-actions { margin-top: 16px; display: flex; gap: 12px; justify-content: center; }
.score-actions button {
  border-radius: var(--radius-sm);
  color: var(--btn-secondary-on);
  font-size: 18px;
  padding: 10px 14px;
  cursor: pointer;
  transition: transform .12s ease-in-out, filter .15s ease-in-out, box-shadow .12s ease-in-out;
  box-shadow: var(--elevation-1);
  border: 1px solid color-mix(in srgb, var(--accent-secondary) 65%, #000 35%);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-secondary) 92%, #fff 8%),
      color-mix(in srgb, var(--accent-secondary) 70%, #000 30%) 85%
    );
}
.score-actions button:hover { transform: scale(1.06); filter: brightness(.98); }
.score-actions button:focus-visible { outline: none; box-shadow: var(--focus-ring); }

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -56%); }
  to   { opacity: 1; transform: translate(-50%, -50%); }
}

/* Responsive tweaks */
@media (max-width: 600px) {
  .card-content { flex-direction: column; }
  .image-container img { max-height: 28vh; }
}
</style>



