<!-- src/views/tools/ClassroomTimer.vue -->
<template>
  <section class="timer-page app-bg">
    <!-- Top bar -->
    <header class="topbar">
      <button class="icon-btn back" type="button" @click="goBack" aria-label="Back" title="Back">
        <img class="icon" :src="backIcon" alt="" />
      </button>

      <h1 class="title" aria-live="polite">Classroom Timer</h1>

      <!-- Right-side actions: Mute (left) + Settings (far right) -->
      <div class="topbar-actions">
        <button class="icon-btn mute" type="button" :aria-pressed="muted ? 'true' : 'false'"
          :aria-label="muted ? 'Unmute' : 'Mute'" @click="toggleMute" :title="muted ? 'Unmute' : 'Mute'">
          <img class="icon" :src="muted ? audioOffIcon : audioOnIcon" :key="muted ? 'muted' : 'unmuted'" alt="" />
        </button>

        <button class="icon-btn settings" type="button" @click="toggleSettings" aria-label="Open settings"
          :aria-expanded="showSettings ? 'true' : 'false'" aria-controls="settingsModal" title="Settings">
          <img class="icon" :src="settingsIcon" alt="" />
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="content" :class="{ running }">
      <!-- Timer card (digits + arrows only) -->
      <div class="clock-wrap" role="group" aria-label="Timer digits">
        <div class="digit-grid" :class="{ pulse: pulseActive }" aria-hidden="false">
          <!-- Up arrows -->
          <button v-for="(d, i) in 4" :key="'up-' + i" class="arrow up" type="button" @click="nudgeDigit(i, +1)"
            :aria-label="`Increase digit ${i + 1}`" title="Increase">▲</button>

          <!-- Digits -->
          <div v-for="(digit, i) in displayDigits" :key="'digit-' + i" class="digit"
            :aria-label="`Digit ${i + 1}: ${digit}`">
            {{ digit }} <span v-if="i === 1" class="colon" aria-hidden="true">:</span>
          </div>

          <!-- Down arrows -->
          <button v-for="(d, i) in 4" :key="'down-' + i" class="arrow down" type="button" @click="nudgeDigit(i, -1)"
            :aria-label="`Decrease digit ${i + 1}`" title="Decrease">▼</button>
        </div>
      </div>

      <!-- Controls (centered; mute moved to topbar) -->
      <div class="controls-bar">
        <div class="stack-controls" role="group" aria-label="Timer controls">
          <button class="btn primary" type="button" @click="toggleTimer"
            :aria-label="running ? 'Pause timer' : (totalSeconds > 0 ? 'Start timer' : 'Start timer (0:00)')">
            {{ running ? 'PAUSE' : 'START' }}
          </button>
          <button class="btn reset-light" type="button" @click="resetTimer" aria-label="Reset timer">
            RESET
          </button>
        </div>
      </div>

      <!-- Adjust time grid -->
      <section class="adjust-grid" role="group" aria-label="Adjust time">
        <!-- + row (wide) / right column (small) -->
        <button class="chip inc" type="button" @click="applyPreset(600)">+10 min</button>
        <button class="chip inc" type="button" @click="applyPreset(300)">+5 min</button>
        <button class="chip inc" type="button" @click="applyPreset(60)">+1 min</button>
        <button class="chip inc" type="button" @click="applyPreset(30)">+30 sec</button>
        <button class="chip inc" type="button" @click="applyPreset(5)">+5 sec</button>

        <!-- − row (wide) / left column (small) -->
        <button class="chip dec" type="button" @click="applyPreset(-600)">-10 min</button>
        <button class="chip dec" type="button" @click="applyPreset(-300)">-5 min</button>
        <button class="chip dec" type="button" @click="applyPreset(-60)">-1 min</button>
        <button class="chip dec" type="button" @click="applyPreset(-30)">-30 sec</button>
        <button class="chip dec" type="button" @click="applyPreset(-5)">-5 sec</button>
      </section>
    </main>

    <!-- Settings modal (overlay + outside-click close) -->
    <div v-if="showSettings" class="modal-overlay" id="settingsModal" @click="closeSettings">
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle" @click.stop>
        <button type="button" class="modal-close" aria-label="Close settings" @click="closeSettings">×</button>
        <h2 id="modalTitle" class="modal-title">Timer Settings</h2>

        <div class="field">
          <label for="sound" class="label">Time’s Up Sound</label>
          <select id="sound" v-model.number="selectedSoundIndex" class="select" :disabled="state.randomEndSound"
            :aria-disabled="state.randomEndSound ? 'true' : 'false'">
            <option v-for="(s, idx) in allEndSounds" :key="s.id" :value="idx">{{ s.label }}</option>
          </select>
        </div>

        <div class="field switch">
          <label class="label">Random Sound</label>
          <label class="toggle">
            <input type="checkbox" v-model="state.randomEndSound" />
            <span class="track"><span class="thumb"></span></span>
          </label>
        </div>

        <div class="field">
          <label for="vol" class="label">Volume: {{ Math.round(volume * 100) }}%</label>
          <input id="vol" class="range" type="range" min="0" max="100" step="1" :value="Math.round(volume * 100)"
            :style="{ '--range-fill': Math.round(volume * 100) + '%' }"
            @input="onVolumeInput(($event.target as HTMLInputElement).valueAsNumber)" aria-label="Volume" />

        </div>
      </div>
    </div>

    <!-- Audio (start + end are single elements; click uses a pool) -->
    <audio ref="startBeepEl" :src="startBeepUrl" preload="auto" playsinline></audio>
    <audio ref="endSoundEl" :src="currentEndSoundUrl" preload="auto" playsinline></audio>
  </section>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, reactive, ref, computed, watch } from 'vue';

const backIcon = new URL('@/assets/images/icons/back-icon.png', import.meta.url).toString();
const settingsIcon = new URL('@/assets/images/icons/settings-icon.png', import.meta.url).toString();
const audioOnIcon = new URL('@/assets/images/icons/audio-on.png', import.meta.url).toString();
const audioOffIcon = new URL('@/assets/images/icons/audio-off.png', import.meta.url).toString();

/** ---------------- State ---------------- */
const state = reactive({
  minutes: 0,
  seconds: 0,
  running: false,
  showSettings: false,
  selectedSoundIndex: 0,   // used when randomEndSound = false
  randomEndSound: false,   // if true, pick random timeout sfx on START
  volume: 0.5,
  muted: false,
});
const muted = computed(() => state.muted);

/** Default START-SFX */
const startBeepUrl = new URL('@/assets/sounds/Wood_Block.ogg', import.meta.url).toString();

/** End sounds (alphabetical, with loud ones labeled) */
const allEndSounds = [
  { id: 's5', label: 'Bad to the Bone', src: new URL('@/assets/sounds/meme-sfx/bad-to-the-bone-meme.mp3', import.meta.url).toString() },
  { id: 's6', label: 'Danger Alarm (LOUD)', src: new URL('@/assets/sounds/meme-sfx/danger-alarm-sound-effect-meme.mp3', import.meta.url).toString() },
  { id: 's7', label: 'Dun Dun Dun', src: new URL('@/assets/sounds/meme-sfx/dun-dun-dun-sound-effect.mp3', import.meta.url).toString() },
  { id: 's8', label: 'Emotional Damage', src: new URL('@/assets/sounds/meme-sfx/emotional-damage-meme.mp3', import.meta.url).toString() },
  { id: 's9', label: 'Fail', src: new URL('@/assets/sounds/meme-sfx/fail-sound-effect.mp3', import.meta.url).toString() },
  { id: 's2', label: 'Fanfare', src: new URL('@/assets/sounds/fanfare.mp3', import.meta.url).toString() },
  { id: 's10', label: "JoJo's Golden Wind", src: new URL('@/assets/sounds/meme-sfx/jojos-golden-wind.mp3', import.meta.url).toString() },
  { id: 's3', label: 'Metal Pipe (LOUD)', src: new URL('@/assets/sounds/meme-sfx/metal-pipe.mp3', import.meta.url).toString() },
  { id: 's4', label: 'Oblivion', src: new URL('@/assets/sounds/Stop_Oblivion.mp3', import.meta.url).toString() },
  { id: 's11', label: 'Vine Boom', src: new URL('@/assets/sounds/meme-sfx/vine-boom-sound-effect.mp3', import.meta.url).toString() },
  { id: 's1', label: 'Stop, Wait a Minute!', src: new URL('@/assets/sounds/stop_waitaminute.mp3', import.meta.url).toString() },
];

/** Audio refs */
const startBeepEl = ref<HTMLAudioElement | null>(null);
const endSoundEl = ref<HTMLAudioElement | null>(null);

/** Click SFX: overlapping playback via a pool */
const CLICK_POOL_SIZE = 8;
let clickPool: HTMLAudioElement[] = [];
let clickIdx = 0;
const clickSfxUrl = new URL('@/assets/sounds/Type_Click.ogg', import.meta.url).toString();

/** Template-facing computed */
const showSettings = computed(() => state.showSettings);
const selectedSoundIndex = computed({
  get: () => state.selectedSoundIndex,
  set: (v: number) => (state.selectedSoundIndex = v),
});
const currentEndSoundUrl = computed(() => allEndSounds[state.selectedSoundIndex]?.src ?? '');
const running = computed(() => state.running);
const totalSeconds = computed(() => state.minutes * 60 + state.seconds);
const volume = computed(() => state.volume);

/** Digits */
const displayDigits = computed(() => {
  const mm = Math.max(0, Math.min(99, state.minutes));
  const ss = Math.max(0, Math.min(59, state.seconds));
  return [Math.floor(mm / 10), mm % 10, Math.floor(ss / 10), ss % 10];
});

/** Pulse on timeout */
const pulseActive = ref(false);
let pulseTimer: number | null = null;

/** Timer internals */
let intervalId: number | null = null;
let endTs = 0;
const MAX_TOTAL = 99 * 60 + 59;

/** Prepared end-sound URL for this run (set on START) */
let preparedEndUrl: string | null = null;

/** Helpers */
async function playStartBeep() {
  const el = startBeepEl.value; if (!el) return;
  try { el.currentTime = 0; el.volume = state.volume; el.muted = state.muted; await el.play(); }
  catch { setTimeout(() => { el.currentTime = 0; el.play().catch(() => { }); }, 0); }
}

function playClick() {
  if (!clickPool.length) return;
  const el = clickPool[clickIdx];
  clickIdx = (clickIdx + 1) % clickPool.length;
  try {
    el.currentTime = 0;
    el.volume = Math.min(1, state.volume * 0.9);
    el.muted = state.muted;
    void el.play();
  } catch { }
}

/** Pick and preload the end sound at START time */
async function prepareEndSoundForRun() {
  preparedEndUrl = state.randomEndSound ? pickRandomEndUrl() : currentEndSoundUrl.value;

  const el = endSoundEl.value;
  if (!el || !preparedEndUrl) return;

  try {
    el.src = preparedEndUrl;
    el.preload = 'auto';
    el.load();

    const prevMuted = el.muted;
    el.muted = true;
    await el.play(); // user gesture just happened
    el.pause();
    el.currentTime = 0;
    el.muted = state.muted || prevMuted;
  } catch {
    // best-effort priming
  }
}

function pickRandomEndUrl(): string {
  const i = Math.floor(Math.random() * allEndSounds.length);
  return allEndSounds[i].src;
}

function triggerEndPulse() {
  pulseActive.value = true;
  if (pulseTimer) clearTimeout(pulseTimer);
  pulseTimer = window.setTimeout(() => { pulseActive.value = false; pulseTimer = null; }, 700);
}

function startTimer() {
  if (totalSeconds.value <= 0) return;

  state.running = true;
  endTs = performance.now() + totalSeconds.value * 1000;

  // Choose & preload end sound now to reduce latency at timeout
  void prepareEndSoundForRun();

  // Play start beep
  void playStartBeep();

  stopInterval();
  intervalId = window.setInterval(tick, 100);
}

function pauseTimer() { state.running = false; stopInterval(); }
function resetTimer() {
  pauseTimer();
  state.minutes = 0;
  state.seconds = 0;
  pulseActive.value = false;
  preparedEndUrl = null; // next run will reselect
}
function stopInterval() { if (intervalId !== null) { clearInterval(intervalId); intervalId = null; } }

function tick() {
  const now = performance.now();
  const remaining = Math.max(0, Math.ceil((endTs - now) / 1000));
  state.minutes = Math.floor(remaining / 60);
  state.seconds = remaining % 60;

  if (remaining <= 0) {
    state.running = false;
    stopInterval();

    const url = preparedEndUrl ?? currentEndSoundUrl.value;
    const el = endSoundEl.value;
    if (el) {
      el.src = url;
      el.currentTime = 0;
      el.volume = state.volume;
      el.muted = state.muted;
      void el.play().catch(() => { });
    }

    triggerEndPulse();
  }
}

function toggleTimer() { state.running ? pauseTimer() : startTimer(); }

/** Digit nudge with carry/borrow + click sfx */
function nudgeDigit(index: number, delta: number) {
  playClick();
  const scales = [10 * 60, 60, 10, 1];
  const before = totalSeconds.value;
  let after = before + delta * scales[index];
  after = Math.max(0, Math.min(MAX_TOTAL, after));
  state.minutes = Math.floor(after / 60);
  state.seconds = after % 60;
  if (state.running) endTs += (after - before) * 1000;
}

/** Presets (+/-; works while running) */
function applyPreset(deltaSec: number) {
  playClick();
  const current = totalSeconds.value;
  const target = Math.max(0, Math.min(MAX_TOTAL, current + deltaSec));
  state.minutes = Math.floor(target / 60);
  state.seconds = target % 60;
  if (state.running) endTs += (target - current) * 1000;
}

/** Navigation & Settings */
function goBack() { history.length > 1 ? history.back() : window.location.assign('/'); }
function toggleSettings() {
  state.showSettings = !state.showSettings;
  document.documentElement.style.overflow = state.showSettings ? 'hidden' : '';
}
function closeSettings() { state.showSettings = false; document.documentElement.style.overflow = ''; }

/** Mute handling */
function toggleMute() {
  state.muted = !state.muted;
  applyMuteToAll();
}
function applyMuteToAll() {
  if (startBeepEl.value) startBeepEl.value.muted = state.muted;
  if (endSoundEl.value) endSoundEl.value.muted = state.muted;
  for (const el of clickPool) el.muted = state.muted;
}

/** Volume */
function onVolumeInput(v: number) { state.volume = Math.max(0, Math.min(100, v)) / 100; }
watch(volume, (v) => {
  if (startBeepEl.value) startBeepEl.value.volume = v;
  if (endSoundEl.value) endSoundEl.value.volume = v;
  for (const el of clickPool) el.volume = Math.min(1, v * 0.9);
});

/** One-time audio unlock (iOS/Safari) */
function unlockAudioOnce() {
  const unlock = (el: HTMLAudioElement | null) => {
    if (!el) return; const m = el.muted; el.muted = true;
    el.play().then(() => { el.pause(); el.currentTime = 0; el.muted = m; }).catch(() => { el.muted = m; });
  };
  unlock(startBeepEl.value);
  unlock(endSoundEl.value);
  for (const el of clickPool) unlock(el);
  window.removeEventListener('pointerdown', unlockAudioOnce);
}

onMounted(() => {
  // Create click SFX pool for overlapping playback
  clickPool = Array.from({ length: CLICK_POOL_SIZE }, () => {
    const a = new Audio(clickSfxUrl);
    a.preload = 'auto';
    (a as any).playsInline = true;
    a.volume = Math.min(1, state.volume * 0.9);
    a.muted = state.muted;
    return a;
  });

  if (startBeepEl.value) { startBeepEl.value.volume = state.volume; startBeepEl.value.muted = state.muted; }
  if (endSoundEl.value) { endSoundEl.value.volume = state.volume; endSoundEl.value.muted = state.muted; }

  window.addEventListener('pointerdown', unlockAudioOnce, { once: true });
});

onBeforeUnmount(() => {
  stopInterval();
  document.documentElement.style.overflow = '';
  window.removeEventListener('pointerdown', unlockAudioOnce);
  if (pulseTimer) clearTimeout(pulseTimer);
});
</script>

<style scoped>
/* ===== Page structure ===== */
.timer-page {
  min-height: 100svh;
  display: grid;
  grid-template-rows: max-content 1fr;
  color: var(--main-text-color);
}

/* Top bar (transparent over global background) */
.topbar {
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
  background: transparent;
  border-bottom: none;
}

.title {
  margin: 0;
  text-align: center;
  font-weight: 900;
  letter-spacing: .3px;
  font-size: var(--main-title-size);
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}

@media (max-width: 560px) {
  .title {
    display: none;
  }
}

.icon-btn {
  display: inline-grid;
  place-items: center;
  background: transparent;
  border: none;
  cursor: pointer;
  margin-inline: 10px;
  padding: 4px;
  transition: transform .14s ease;
}

.icon {
  width: 34px;
  height: 34px;
  object-fit: contain;
}

/* Hover animations */
.icon-btn.back:hover,
.icon-btn.mute:hover {
  transform: scale(1.1);
}

.icon-btn.settings {
  transition: transform .18s ease;
}

.icon-btn.settings:hover {
  transform: scale(1.1) rotate(10deg);
}

/* Right-side action group (mute to the left, settings at far right) */
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Main layout */
.content {
  display: grid;
  place-items: center;
  gap: 20px;
  padding: 0 16px 20px;
}

/* Timer card uses TABLE tokens for a neutral card surface */
.clock-wrap {
  width: min(860px, 100%);
  display: grid;
  gap: 16px;
  padding: 18px 22px;
  background: var(--table-surface);
  color: var(--table-on-surface);
  border: 1px solid var(--table-border);
  border-radius: var(--table-radius);
  box-shadow: var(--table-shadow);
  margin: 0 16px;
  box-sizing: border-box;
  overflow: hidden;
}

/* Digits & arrows */
.digit-grid {
  --digit-size: clamp(64px, 18vw, 140px);
  display: grid;
  grid-template-columns: repeat(4, var(--digit-size));
  grid-auto-rows: max-content;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-inline: auto;
  user-select: none;
}

.arrow {
  background: transparent;
  border: none;
  padding: 6px;
  font-size: clamp(18px, 4.2vw, 28px);
  line-height: 1;
  color: var(--table-on-surface);
  opacity: 0.32;
  cursor: pointer;
  transition: transform .12s ease, opacity .12s ease;
  will-change: transform, opacity;
}

.arrow:hover,
.arrow:focus-visible {
  opacity: 1;
  transform: scale(1.22);
}

.arrow:active {
  transform: translateY(1px) scale(1.05);
}

/* Bigger digits */
.digit {
  position: relative;
  font-variant-numeric: tabular-nums;
  font-family: ui-rounded, "Baloo 2", system-ui, sans-serif;
  font-size: clamp(72px, 20vw, 180px);
  font-weight: 900;
  letter-spacing: .02em;
  text-align: center;
  padding: 6px 0;
  min-width: var(--digit-size);
  color: var(--table-on-surface);
}

.colon {
  position: absolute;
  right: -10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: .6em;
  opacity: .9;
}

/* End-of-timer single pulse */
@keyframes pulseOnce {
  0% {
    transform: scale(1)
  }

  30% {
    transform: scale(1.08)
  }

  100% {
    transform: scale(1)
  }
}

.digit-grid.pulse .digit {
  animation: pulseOnce .7s ease-out 1;
}

@media (prefers-reduced-motion: reduce) {
  .digit-grid.pulse .digit {
    animation-duration: 1s;
  }
}

/* Controls (centered) */
.controls-bar {
  width: min(860px, 100%);
  display: grid;
  grid-template-columns: 1fr;
  padding: 0 16px;
}

.stack-controls {
  display: grid;
  gap: 12px;
  width: min(420px, 90%);
  margin: 0 auto;
  justify-items: center;
}

.stack-controls .btn {
  width: 100%;
}

/* Buttons (thicker borders) — read from global button tokens */
.btn {
  padding: 14px 20px;
  border-radius: var(--radius-lg);
  font-weight: 900;
  letter-spacing: .3px;
  border: 3px solid var(--_border, var(--btn-ghost-border));
  cursor: pointer;
  box-shadow: var(--elevation-1);
  background: var(--_bg, var(--btn-ghost-bg));
  color: var(--_on, var(--btn-ghost-on));
  transition: transform .12s ease, filter .12s ease;
}

.btn:hover {
  transform: scale(1.03);
}

.btn:active {
  transform: translateY(1px) scale(.99);
}

/* Start = Success */
.btn.primary {
  --_bg: var(--btn-success-bg);
  --_on: var(--btn-success-on);
  --_border: var(--btn-success-border);
}

/* Reset = Ghost (off-white) */
.btn.reset-light {
  --_bg: var(--btn-ghost-bg);
  --_on: var(--btn-ghost-on);
  --_border: var(--btn-ghost-border);
}

/* Adjust time grid */
.adjust-grid {
  width: min(860px, 100%);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(36px, auto));
  gap: 16px;
  padding: 0 16px;
  margin-top: 8px;
  box-sizing: border-box;
}

/* Preset chips with thicker color-coded borders using accent tokens */
.chip {
  padding: 12px 14px;
  border-radius: 999px;
  background: var(--table-surface);
  color: var(--table-on-surface);
  font-weight: 800;
  letter-spacing: .2px;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition: transform .12s ease;
  min-width: 0;
  text-align: center;
  border: 4px solid var(--table-border);
}

.chip:hover {
  transform: scale(1.03);
}

.chip:active {
  transform: translateY(1px) scale(.99);
}

/* */
.chip.inc {
  /* + time → blue */
  grid-row: 1;
  border-color: var(--accent-primary);
}

.chip.dec {
  /* - time → red */
  grid-row: 2;
  border-color: var(--accent-danger);
}

@media (max-width: 720px) {
  .chip {
    padding: 10px 12px;
    font-size: .95rem;
  }
}

/* Small screens: rotate -> 5 rows × 2 cols (left = −, right = +) */
@media (max-width: 430px) {
  .adjust-grid {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: repeat(5, minmax(36px, auto));
    gap: 10px 12px;
    grid-auto-flow: row dense;
  }

  .chip {
    width: 100%;
    padding: 10px 12px;
    font-size: .92rem;
  }

  .chip.inc {
    grid-row: auto;
    grid-column: 2;
  }

  /* right */
  .chip.dec {
    grid-row: auto;
    grid-column: 1;
  }

  /* left  */
}

/* Modal overlay + card — modal tokens */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  display: grid;
  place-items: center;
  z-index: 1000;
}

.modal-card {
  position: relative;
  width: min(520px, 92vw);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  border-radius: var(--modal-radius);
  padding: 20px;
  display: grid;
  gap: 16px;
  box-shadow: var(--modal-shadow);
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  color: var(--modal-on-surface);
}

.field {
  display: grid;
  gap: 8px;
}

/* Labels */
.label {
  font-size: .95rem;
  color: var(--modal-on-surface);
}

/* Toggle (Random Sound etc.) */
.switch {
  align-items: center;
  grid-auto-flow: column;
  justify-content: space-between;
}

.toggle {
  display: inline-grid;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.toggle input {
  opacity: 0;
  pointer-events: none;
}

.toggle .track {
  /* Inner math: height 28px with 2px border → 24px inner height.
     We set the thumb to that inner size and inset it evenly. */
  --thumb-size: 24px;
  --thumb-inset: 0px;

  width: 48px;
  height: 28px;
  background: var(--neutral-200);
  border: 2px solid var(--table-border);
  border-radius: 999px;
  position: relative;
  transition: background .15s ease, border-color .15s ease;
  box-sizing: border-box;
}

.toggle .thumb {
  position: absolute;
  top: var(--thumb-inset);
  left: var(--thumb-inset);
  width: var(--thumb-size);
  height: var(--thumb-size);
  border-radius: 50%;
  background: var(--neutral-0);
  border: 2px solid var(--table-border);
  box-shadow: var(--elevation-1);
  transition: left .15s ease, background .15s ease, border-color .15s ease;
}

.toggle input:checked+.track {
  background: var(--accent-warning);
  border-color: var(--btn-secondary-border);
}

.toggle input:checked+.track .thumb {
  /* Slide to the far edge, respecting the same inset */
  left: calc(100% - var(--thumb-size) - var(--thumb-inset));
  background: var(--neutral-0);
  border-color: var(--table-border);
}

/* Inputs */
.select {
  width: 100%;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 2px solid var(--table-border);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  font-weight: 700;
  box-shadow: var(--elevation-1);
  appearance: auto;
  -webkit-appearance: auto;
  pointer-events: auto;
  position: relative;
  z-index: 0;
}

.select:disabled {
  opacity: .55;
  cursor: not-allowed;
}

/* Volume slider — left side filled with accent-secondary */
.range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px;
  border: 2px solid var(--table-border);
  border-radius: 999px;
  box-shadow: var(--elevation-1);
  background: linear-gradient(to right,
      var(--accent-secondary) 0 var(--range-fill),
      var(--neutral-100) var(--range-fill) 100%);
  /* fallback when custom prop is missing */
  --range-fill: 0%;
}

/* WebKit track keeps the same two-tone background */
.range::-webkit-slider-runnable-track {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(to right,
      var(--accent-secondary) 0 var(--range-fill),
      var(--neutral-100) var(--range-fill) 100%);
}

/* Firefox: use progress + track to get a native filled-left look */
.range::-moz-range-track {
  height: 10px;
  border-radius: 999px;
  background: var(--neutral-100);
  border: none;
}

.range::-moz-range-progress {
  height: 10px;
  border-radius: 999px;
  background: var(--accent-secondary);
}

/* Thumb (unchanged, tokenized) */
.range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  background: var(--accent-primary);
  border: 2px solid var(--btn-primary-border);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  margin-top: -6px;
  /* centers the thumb on 10px track in WebKit */
}

.range::-moz-range-thumb {
  width: 22px;
  height: 22px;
  background: var(--accent-primary);
  border: 2px solid var(--btn-primary-border);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--elevation-1);
}


/* Red circle X button — modal-close tokens */
.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 2px solid var(--modal-close-border);
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  font-weight: 900;
  line-height: 1;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition: transform .12s ease;
}

.modal-close:hover {
  transform: scale(1.08);
}
</style>
