<!-- src/views/tools/HotPotato.vue -->
<template>
  <section class="hot-potato-page app-bg">
    <!-- Floating Back (top-left of the entire page) -->
    <button class="back-floating" type="button" aria-label="Back" title="Back" @click="goBack">
      <img :src="backIcon" alt="" />
    </button>

    <!-- Floating Settings (top-right of the entire page; icon-only, no bg/card) -->
    <button
      class="settings-floating"
      type="button"
      :title="'Settings'"
      aria-haspopup="dialog"
      :aria-expanded="showSettings ? 'true' : 'false'"
      aria-controls="hp-settings"
      @click="openSettings"
    >
      <img :src="settingsIcon" alt="Settings" />
    </button>

    <div class="hp-card" role="region" aria-label="Hot Potato Sound Board">
      <!-- Top bar (title only now) -->
      <header class="hp-topbar">
        <h2 class="hp-title">Hot Potato Sound Board</h2>
      </header>

      <p class="hp-sub">Tap 🎵 to start the music & timer. Tap 💣 to stop and reset.</p>

      <!-- Big Buttons -->
      <div class="hp-actions">
        <!-- Music Button -->
        <button
          class="hp-btn music"
          type="button"
          @click="onMusic"
          :disabled="!musicReady || isPlaying"
          :aria-pressed="isPlaying ? 'true' : 'false'"
          :aria-busy="!musicReady ? 'true' : 'false'"
          aria-label="Start music and timer"
        >
          <div class="hp-btn-inner">
            <svg viewBox="0 0 24 24" class="hp-icon" aria-hidden="true">
              <path d="M12 3v10.55a4 4 0 1 1-2-3.45V6h8V3h-6z" fill="currentColor" />
            </svg>
            <span class="hp-btn-label" v-if="musicReady">Music</span>
            <span class="hp-btn-label loading" v-else>
              <span class="spinner" aria-hidden="true"></span>
              Loading…
            </span>
          </div>
        </button>

        <!-- Bomb Button -->
        <button class="hp-btn bomb" type="button" @click="onBomb" aria-label="Stop music and play bomb">
          <div class="hp-btn-inner">
            <svg viewBox="0 0 24 24" class="hp-icon" aria-hidden="true">
              <path
                d="M17.5 2a1 1 0 0 1 .96.73l.27.97.97.27A1 1 0 0 1 20 6l-.86.5.38.92a1 1 0 0 1-1.84.76l-.38-.92-.92.38a1 1 0 0 1-.76-1.84l.92-.38L17 3a1 1 0 0 1 .5-1z"
                fill="currentColor"
              />
              <path d="M10 8a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" fill="currentColor" opacity=".95" />
            </svg>
            <span class="hp-btn-label">Bomb</span>
          </div>
        </button>
      </div>

      <!-- Timer -->
      <div class="hp-timer" aria-live="polite" aria-atomic="true">
        {{ formattedTime }}
      </div>

      <!-- Hidden audio elements -->
      <audio ref="musicEl" preload="metadata" playsinline>
        <source v-for="s in selectedMusicSources" :key="s.url" :src="s.url" :type="s.type" />
      </audio>
      <audio ref="bombEl" preload="metadata" playsinline>
        <source v-for="s in selectedBombSources" :key="s.url" :src="s.url" :type="s.type" />
      </audio>

      <!-- Settings Modal -->
      <div
        v-if="showSettings"
        class="modal-wrap"
        role="dialog"
        aria-modal="true"
        id="hp-settings"
        @click.self="closeSettings"
      >
        <div class="modal">
          <header class="modal-head">
            <h3 class="modal-title">Hot Potato Settings</h3>
            <button class="modal-x" @click="closeSettings" aria-label="Close settings">×</button>
          </header>

            <div class="modal-body">
              <!-- Auto Mode -->
              <div class="row toggle">
                <label class="lbl" for="autoMode">Auto Mode</label>
                <label class="switch">
                  <input id="autoMode" type="checkbox" v-model="autoMode" @change="onToggleAutoMode" />
                  <span class="slider"></span>
                </label>
              </div>

              <!-- Random Interval -->
              <div class="row">
                <label class="lbl" for="randMin">Random Interval</label>
                <div class="inline">
                  <span>Range:</span>
                  <input
                    id="randMin"
                    type="number"
                    min="2"
                    max="60"
                    v-model.number="randMin"
                    :disabled="!autoMode"
                    @change="onUpdateInterval"
                  />
                  <span>–</span>
                  <input
                    id="randMax"
                    type="number"
                    min="2"
                    max="60"
                    v-model.number="randMax"
                    :disabled="!autoMode"
                    @change="onUpdateInterval"
                  />
                  <span>seconds</span>
                </div>
                <p class="hint">When Auto Mode is on, a bomb will play after a random delay in this range.</p>
              </div>

              <!-- Music Select -->
              <div class="row">
                <label class="lbl" for="musicSel">Music</label>
                <select id="musicSel" v-model="musicKey" @change="applyMusic">
                  <option value="World of Games">World of Games (default)</option>
                  <option value="Out of Time">Out of Time</option>
                </select>
              </div>

              <!-- Bomb Select -->
              <div class="row">
                <label class="lbl" for="bombSel">Bomb SFX</label>
                <select id="bombSel" v-model="bombKey" @change="applyBomb">
                  <option value="bomb">Bomb (default)</option>
                  <option value="dundun">Dun-Dun-Da-Dun</option>
                  <option value="stop">Stop! (Law violation)</option>
                </select>
              </div>

              <!-- Volumes -->
              <div class="row">
                <label class="lbl" for="musicVol">Music Volume</label>
                <input
                  id="musicVol"
                  class="range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  v-model.number="musicVolPercent"
                  :style="{ '--range-fill': musicVolPercent + '%' }"
                />
              </div>

              <div class="row">
                <label class="lbl" for="sfxVol">SFX Volume</label>
                <input
                  id="sfxVol"
                  class="range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  v-model.number="sfxVolPercent"
                  :style="{ '--range-fill': sfxVolPercent + '%' }"
                />
              </div>
            </div>

          <footer class="modal-foot">
            <!-- Only Update button remains -->
            <button class="btn primary btn-scale" @click="applyAndClose">Update</button>
          </footer>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';

/* -------------------------------------------------
   Assets
--------------------------------------------------*/
import backIcon from '@/assets/images/icons/back-icon.png';
import settingsIcon from '@/assets/images/icons/settings-icon.png';

/* MUSIC */
import music8bitMp3 from '@/assets/sounds/music/the-world-of-8-bit-games.mp3';
import musicOutOfTimeOgg from '@/assets/sounds/music/Three Red Hearts - Out of Time.ogg';

/* SFX */
import sfxBombMp3 from '@/assets/sounds/bomb.mp3';
import sfxDunDunMp3 from '@/assets/sounds/meme-sfx/dun-dun-dun-sound-effect.mp3';
import sfxStopMp3 from '@/assets/sounds/Stop_Oblivion.mp3';

type Source = { url: string; type: string };

const MUSIC_SOURCES: Record<'World of Games' | 'Out of Time', Source[]> = {
  'World of Games': [{ url: music8bitMp3, type: 'audio/mpeg' }],
  'Out of Time': [{ url: musicOutOfTimeOgg, type: 'audio/ogg' }],
};
const SFX_SOURCES: Record<'bomb' | 'dundun' | 'stop', Source[]> = {
  bomb: [{ url: sfxBombMp3, type: 'audio/mpeg' }],
  dundun: [{ url: sfxDunDunMp3, type: 'audio/mpeg' }],
  stop: [{ url: sfxStopMp3, type: 'audio/mpeg' }],
};

/* Volumes */
const musicVolume = ref(0.35);
const sfxVolume = ref(0.9);
function applyVolumes() {
  if (musicEl.value) musicEl.value.volume = musicVolume.value;
  if (bombEl.value) bombEl.value.volume = sfxVolume.value;
}
const musicVolPercent = computed({
  get: () => Math.round(musicVolume.value * 100),
  set: (v: number) => {
    musicVolume.value = Math.min(1, Math.max(0, v / 100));
    applyVolumes();
  },
});
const sfxVolPercent = computed({
  get: () => Math.round(sfxVolume.value * 100),
  set: (v: number) => {
    sfxVolume.value = Math.min(1, Math.max(0, v / 100));
    applyVolumes();
  },
});

/* Router */
const router = useRouter();
function goBack() {
  router.back();
}

/* Audio refs & state */
const musicEl = ref<HTMLAudioElement | null>(null);
const bombEl = ref<HTMLAudioElement | null>(null);

const isPlaying = ref(false);
const musicReady = ref(false);

const musicKey = ref<'World of Games' | 'Out of Time'>('World of Games');
const bombKey = ref<'bomb' | 'dundun' | 'stop'>('bomb');

const selectedMusicSources = computed<Source[]>(() => MUSIC_SOURCES[musicKey.value]);
const selectedBombSources = computed<Source[]>(() => SFX_SOURCES[bombKey.value]);

/* Timer */
const startTs = ref<number | null>(null);
const elapsedMs = ref(0);
let rafId: number | null = null;

const formattedTime = computed(() => {
  const total = Math.floor(elapsedMs.value / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
});

function tick(now: number) {
  if (startTs.value != null) {
    elapsedMs.value = now - startTs.value;
    rafId = requestAnimationFrame(tick);
  }
}
function startTimerFresh() {
  startTs.value = performance.now();
  elapsedMs.value = 0;
  rafId = requestAnimationFrame(tick);
}
function resetTimer() {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
  startTs.value = null;
  elapsedMs.value = 0;
}

/* Auto Mode */
const showSettings = ref(false);
const randMin = ref(2);
const randMax = ref(60);
const autoMode = ref(false);
let autoTimerId: number | null = null;

function randomDelayMs(minS: number, maxS: number) {
  const min = Math.max(2, Math.min(minS, maxS));
  const max = Math.min(60, Math.max(minS, maxS));
  const sec = min + Math.random() * (max - min);
  return Math.round(sec * 1000);
}
function clearAutoTimer() {
  if (autoTimerId != null) {
    window.clearTimeout(autoTimerId);
    autoTimerId = null;
  }
}
function scheduleAutoBomb() {
  clearAutoTimer();
  if (!autoMode.value || !isPlaying.value) return;
  const delay = randomDelayMs(randMin.value, randMax.value);
  autoTimerId = window.setTimeout(async () => {
    await onBomb();
    clearAutoTimer();
  }, delay);
}
function onToggleAutoMode() {
  if (autoMode.value && isPlaying.value) {
    scheduleAutoBomb();
  } else {
    clearAutoTimer();
  }
}
function onUpdateInterval() {
  if (randMin.value < 5) randMin.value = 2;
  if (randMax.value > 30) randMax.value = 60;
  if (randMin.value > randMax.value) {
    const t = randMin.value;
    randMin.value = randMax.value;
    randMax.value = t;
  }
  if (autoMode.value && isPlaying.value) {
    scheduleAutoBomb();
  }
}

/* Playback */
async function onMusic() {
  if (!musicEl.value || !musicReady.value) return;
  if (isPlaying.value) return;

  if (bombEl.value) {
    bombEl.value.pause();
    bombEl.value.currentTime = 0;
  }
  musicEl.value.loop = true;
  musicEl.value.currentTime = 0;

  try {
    await musicEl.value.play();
    isPlaying.value = true;
    startTimerFresh();
    if (autoMode.value) scheduleAutoBomb();
  } catch (e) {
    console.warn('Music play blocked by browser:', e);
  }
}
async function onBomb() {
  if (musicEl.value) {
    musicEl.value.pause();
    musicEl.value.currentTime = 0;
  }
  isPlaying.value = false;

  if (bombEl.value) {
    try {
      bombEl.value.currentTime = 0;
      await bombEl.value.play();
    } catch (e) {
      console.warn('Bomb play blocked by browser:', e);
    }
  }
  resetTimer();
  clearAutoTimer();
}

/* Settings modal helpers */
function openSettings() {
  showSettings.value = true;
  document.documentElement.style.overflow = 'hidden';
}
function closeSettings() {
  showSettings.value = false;
  document.documentElement.style.overflow = '';
}

/* Readiness */
function wireMusicReadiness(el: HTMLAudioElement) {
  musicReady.value = false;
  const cleanup = () => {
    el.removeEventListener('loadedmetadata', markReady);
    el.removeEventListener('canplay', markReady);
    el.removeEventListener('canplaythrough', markReady);
    el.removeEventListener('error', onError);
  };
  const markReady = () => {
    musicReady.value = true;
    cleanup();
  };
  const onError = () => {
    musicReady.value = false;
    console.warn('Music element error', el.error);
    cleanup();
  };
  el.addEventListener('loadedmetadata', markReady);
  el.addEventListener('canplay', markReady);
  el.addEventListener('canplaythrough', markReady);
  el.addEventListener('error', onError);

  if (el.readyState >= 2) {
    musicReady.value = true;
    cleanup();
  }
}
async function applyMusic() {
  musicReady.value = false;
  if (!musicEl.value) return;
  if (isPlaying.value) {
    musicEl.value.pause();
    isPlaying.value = false;
    resetTimer();
    clearAutoTimer();
  }
  const el = musicEl.value;
  await nextTick();
  el.load();
  wireMusicReadiness(el);
  applyVolumes();
}
async function applyBomb() {
  if (!bombEl.value) return;
  await nextTick();
  bombEl.value.load();
  applyVolumes();
}
function applyAndClose() {
  onUpdateInterval();
  closeSettings();
}

/* Lifecycle */
onMounted(() => {
  if (musicEl.value) wireMusicReadiness(musicEl.value);
  if (bombEl.value) {
    bombEl.value.addEventListener('error', () => console.warn('Bomb element error', bombEl.value?.error));
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showSettings.value) closeSettings();
  };
  window.addEventListener('keydown', onKey);
  applyVolumes();

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey);
  });
});
onBeforeUnmount(() => {
  if (musicEl.value) {
    musicEl.value.pause();
    musicEl.value.currentTime = 0;
  }
  if (bombEl.value) {
    bombEl.value.pause();
    bombEl.value.currentTime = 0;
  }
  if (rafId != null) cancelAnimationFrame(rafId);
  clearAutoTimer();
  document.documentElement.style.overflow = '';
});

/* Watches */
watch([autoMode, musicKey, randMin, randMax], () => {
  if (autoMode.value && isPlaying.value) {
    scheduleAutoBomb();
  }
});
watch([musicVolume, sfxVolume], applyVolumes);
</script>

<style scoped>
.hot-potato-page {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: clamp(16px, 3vw, 32px);
  position: relative;
}

/* Floating back button (icon-only) */
.back-floating {
  position: fixed;
  top: clamp(12px, 2vw, 20px);
  left: clamp(12px, 2vw, 20px);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: 60;
  line-height: 0;
  transition: transform .12s ease;
}
.back-floating img {
  width: clamp(28px, 4.5vw, 40px);
  height: clamp(28px, 4.5vw, 40px);
  display: block;
}
@media (hover:hover) {
  .back-floating:hover { transform: scale(1.08); }
}

/* Floating settings (top-right, icon-only, no bg/card) */
.settings-floating {
  position: fixed;
  top: clamp(12px, 2vw, 20px);
  right: clamp(12px, 2vw, 20px);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: 60;
  line-height: 0;
  transition: transform .12s ease;
}
.settings-floating img {
  width: clamp(28px, 4.5vw, 40px);
  height: clamp(28px, 4.5vw, 40px);
  display: block;
}
@media (hover:hover) {
  .settings-floating:hover { transform: scale(1.08) rotate(10deg); }
}

/* Card / panel — use TABLE tokens for a neutral card */
.hp-card {
  width: min(960px, 100%);
  margin-inline: 12px;
  box-sizing: border-box;
  border-radius: var(--table-radius);
  padding: clamp(16px, 3.6vw, 32px);
  background: var(--table-surface);
  color: var(--table-on-surface);
  border: 1px solid var(--table-border);
  box-shadow: var(--table-shadow);
}

/* Top bar (title only now) */
.hp-topbar {
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: 12px;
}
.hp-title {
  margin: 0;
  font-size: clamp(20px, 3.2vw, 32px);
  font-weight: 800;
  letter-spacing: 0.2px;
  color: var(--table-on-surface);
}
.hp-sub {
  margin: 6px 0 16px 0;
  font-size: clamp(12px, 1.6vw, 14px);
  color: var(--table-muted);
}

/* Actions (big buttons) */
.hp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(14px, 2.6vw, 24px);
  justify-items: center;
  align-items: stretch;
  margin-bottom: clamp(18px, 3vw, 28px);
}
.hp-btn {
  --btn-pad: clamp(16px, 3.2vw, 28px);
  --btn-radius: 22px;
  display: block;
  width: 100%;
  min-height: clamp(140px, 30vw, 220px);
  padding: var(--btn-pad);
  border-radius: var(--btn-radius);
  border: 3px solid var(--table-border);
  color: var(--table-on-surface);
  background: var(--neutral-100);
  box-shadow: 0 8px 0 var(--neutral-300), var(--table-shadow);
  transform: translateY(0);
  transition: transform .06s ease, box-shadow .06s ease, filter .2s ease, opacity .2s ease;
  cursor: pointer;
  user-select: none;
  position: relative;
  isolation: isolate;
}
.hp-btn[disabled] { opacity: 0.6; cursor: not-allowed; }
.hp-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, .6), transparent 60%);
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 0;
}
.hp-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
@media (hover:hover) {
  .hp-btn:hover { transform: translateY(-2px) scale(1.03); }
}
.hp-btn:active {
  transform: translateY(4px);
  box-shadow: 0 4px 0 var(--neutral-300), var(--table-shadow);
}
.hp-btn-inner {
  display: grid;
  grid-auto-flow: row;
  justify-items: center;
  align-content: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.hp-icon { width: clamp(38px, 6vw, 64px); height: clamp(38px, 6vw, 64px); }
.hp-btn-label { font-weight: 900; letter-spacing: .3px; font-size: clamp(16px, 2.6vw, 22px); }

/* Music colorway — use accent warning (yellow) tokens */
.hp-btn.music {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-warning) 92%, var(--neutral-0) 8%),
      color-mix(in srgb, var(--accent-warning) 70%, var(--neutral-900) 30%) 85%
    );
  border-color: color-mix(in srgb, var(--accent-warning) 65%, var(--neutral-900) 35%);
  color: var(--table-on-surface);
}
.hp-btn.music .hp-icon { color: var(--table-on-surface); }

/* Bomb colorway — use accent danger (red) tokens */
.hp-btn.bomb {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-danger) 92%, var(--neutral-0) 8%),
      color-mix(in srgb, var(--accent-danger) 70%, var(--neutral-900) 30%) 85%
    );
  border-color: color-mix(in srgb, var(--accent-danger) 65%, var(--neutral-900) 35%);
  color: var(--table-on-surface);
}
.hp-btn.bomb .hp-icon { color: var(--table-on-surface); }

/* Timer */
.hp-timer {
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  letter-spacing: .5px;
  font-size: clamp(44px, 10vw, 92px);
  color: var(--table-on-surface);
  padding: clamp(8px, 1.2vw, 12px) clamp(12px, 1.8vw, 18px);
  border-radius: var(--table-radius);
  background: var(--table-surface);
  border: 1px solid var(--table-border);
  box-shadow: var(--table-shadow);
}

/* Responsive: stack buttons on narrow screens */
@media (max-width: 640px) { .hp-actions { grid-template-columns: 1fr; } }

/* Spinner */
.spinner {
  display: inline-block;
  width: 1em; height: 1em;
  margin-right: .4em;
  border-radius: 50%;
  border: 2px solid var(--table-border);
  border-top-color: var(--table-on-surface);
  animation: spin 0.8s linear infinite;
  vertical-align: -0.1em;
}
@keyframes spin { to { transform: rotate(360deg); } }
.hp-btn-label.loading { display: inline-flex; align-items: center; }

/* Modal overlay + frame — use MODAL tokens */
.modal-wrap {
  position: fixed;
  inset: 0;
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 70; /* above floats */
}

/* The modal becomes a flex column so the body can scroll if needed */
.modal {
  width: min(540px, 100%);
  max-height: min(88vh, 640px);
  margin-inline: 12px;
  box-sizing: border-box;
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  box-shadow: var(--modal-shadow);
  border-radius: var(--modal-radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Slightly reduce overlay padding on very small screens */
@media (max-width: 480px) { .modal-wrap { padding: 12px; } }

.modal-head {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  background: var(--modal-surface);
  border-bottom: 1px solid var(--modal-border);
}
.modal-title { margin: 0; font-weight: 800; font-size: 18px; color: var(--modal-on-surface); }

/* Modal close button — use modal close tokens */
.modal-x {
  appearance: none;
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 2px solid var(--modal-close-border);
  background: var(--modal-close-bg);
  color: var(--modal-close-on);
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  display: grid; place-items: center;
  box-shadow: var(--modal-shadow);
  transition: transform .12s ease;
}
.modal-x:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
@media (hover:hover) {
  .modal-x:hover { transform: scale(1.06); }
}

/* Scrollable body on small screens */
.modal-body {
  padding: 16px;
  display: grid;
  gap: 14px;
  overflow: auto;
  overscroll-behavior: contain;
}

/* Rows and inputs */
.row { display: grid; gap: 8px; }
.row .lbl {
  font-weight: 700;
  color: var(--modal-on-surface);
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}
.row .inline {
  display: inline-grid;
  grid-auto-flow: column;
  gap: 8px;
  align-items: center;
  width: fit-content;
}

.row input[type="number"] { width: 110px; max-width: 100%; }
.row select { width: clamp(150px, 50vw, 240px); max-width: 100%; }
/* The range width remains responsive, full styling comes from .range below */
.row input[type="range"] { width: min(360px, 70vw); }

.row input[type="number"],
.row select {
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
}
.row input[disabled] { opacity: .55; cursor: not-allowed; }
.row .hint { margin: 0; font-size: 12px; color: var(--modal-on-surface-muted); }

/* Auto Mode row */
.row.toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

/* Switch — tokenized */
.switch {
  --sw-w: 56px; --sw-h: 32px; --sw-pad: 3px; --sw-knob: 24px;
  position: relative; width: var(--sw-w); height: var(--sw-h); display: inline-block;
}
.switch input { display: none; }
.slider {
  position: absolute; inset: 0; cursor: pointer;
  background: var(--neutral-200);
  border: 1px solid var(--modal-border);
  border-radius: 999px;
  transition: background .2s ease, border-color .2s ease;
}
.slider::before {
  content: "";
  position: absolute;
  top: var(--sw-pad); left: var(--sw-pad);
  width: var(--sw-knob); height: var(--sw-knob);
  background: var(--neutral-0);
  border: 2px solid var(--modal-border);
  border-radius: 50%;
  box-shadow: var(--elevation-1);
  transition: transform .2s ease, background .2s ease, border-color .2s ease;
}
/* ON state uses accent-primary (blue) */
.switch input:checked + .slider {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--accent-primary) 90%, var(--neutral-0) 10%),
      color-mix(in srgb, var(--accent-primary) 70%, var(--neutral-900) 30%) 85%
    );
  border-color: color-mix(in srgb, var(--accent-primary) 65%, var(--neutral-900) 35%);
}
.switch input:checked + .slider::before {
  transform: translateX(calc(var(--sw-w) - (var(--sw-pad) * 2 + var(--sw-knob))));
}

/* Stack tight controls on very small screens */
@media (max-width: 420px) {
  .row .inline { grid-auto-flow: row; justify-items: start; width: 100%; }
  .row input[type="number"],
  .row select,
  .row input[type="range"] { width: 100%; max-width: 100%; }
}

/* Modal footer */
.modal-foot {
  display: grid;
  grid-auto-flow: column;
  justify-content: end;
  gap: 10px;
  padding: 12px 16px 16px 16px;
}

/* Footer button — use global button tokens */
.btn {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--btn-ghost-border);
  cursor: pointer;
  font-weight: 800;
  box-shadow: var(--elevation-1);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
}
.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border-color: var(--btn-primary-border);
  transition: transform .12s ease;
}
@media (hover:hover) { .btn.primary.btn-scale:hover { transform: scale(1.04); } }

/* === Volume slider — same look as ClassroomTimer === */
/* Left side filled with --accent-secondary, right side neutral */
.range {
  -webkit-appearance: none; appearance: none;
  width: 100%;
  height: 10px;
  border: 2px solid var(--modal-border);
  border-radius: 999px;
  box-shadow: var(--elevation-1);
  background: linear-gradient(
    to right,
    var(--accent-secondary) 0 var(--range-fill),
    var(--neutral-100) var(--range-fill) 100%
  );
  /* fallback when the custom prop isn't provided by :style */
  --range-fill: 0%;
}

/* WebKit track mirrors the two-tone background */
.range::-webkit-slider-runnable-track {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--accent-secondary) 0 var(--range-fill),
    var(--neutral-100) var(--range-fill) 100%
  );
}

/* Firefox: progress = filled-left; track = rest */
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

/* Thumb (tokenized) */
.range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 22px; height: 22px;
  background: var(--accent-primary);
  border: 2px solid var(--btn-primary-border);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  margin-top: -6px; /* center on 10px track in WebKit */
}
.range::-moz-range-thumb {
  width: 22px; height: 22px;
  background: var(--accent-primary);
  border: 2px solid var(--btn-primary-border);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--elevation-1);
}
</style>
