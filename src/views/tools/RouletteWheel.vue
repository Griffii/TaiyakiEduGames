<!-- src/views/tools/RouletteWheel.vue -->
<template>
  <section class="roulette-page">
    <!-- Back/Home -->
    <button class="home-button" type="button" @click="goBack" aria-label="Back">
      <img :src="homeIcon" alt="" />
    </button>

    <!-- Settings (top-right) -->
    <button class="settings-button" type="button" @click="openSettings" aria-label="Open settings"
      :aria-expanded="showSettings ? 'true' : 'false'" :aria-controls="'settingsModal'">
      <img :src="settingsIcon" alt="" />
    </button>

    <!-- Wheel area -->
    <div class="wheel-container">
      <div class="wheel-wrap" :style="{ '--wheel-size': wheelSize + 'px' }" @click="spinWheel">
        <div class="indicator" aria-hidden="true"></div>
        <canvas ref="canvasEl" class="wheel"></canvas>
      </div>

      <button id="spinButton" class="spin-btn" type="button" :disabled="numbers.length === 0 || spinning"
        @click="spinWheel" aria-live="polite">
        {{ spinning ? "SPINNING…" : "SPIN" }}
      </button>

      <p class="muted" v-if="numbers.length === 0">No values. Open settings to set a range.</p>
    </div>

    <!-- Result popup -->
    <Transition name="fade-zoom">
      <div v-show="popupOpen" class="popup" role="dialog" aria-modal="true" aria-labelledby="popupText">
        <div class="popup-card">
          <h2 id="popupText" class="pop-value">{{ selectedText }}</h2>
          <div class="pop-actions">
            <button class="btn subtle" type="button" @click="removeSelected">Remove Value</button>
            <button class="btn" type="button" @click="closePopup">Continue</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Settings modal (compact, aligned) -->
    <Transition name="fade-zoom">
      <div v-show="showSettings" class="popup" role="dialog" aria-modal="true" aria-labelledby="settingsTitle"
        id="settingsModal" @click.self="closeSettings">
        <div class="popup-card settings-card">
          <h2 id="settingsTitle" class="settings-title">Settings</h2>

          <form class="settings-form" @submit.prevent="applyAndClose">
            <!-- Line 1: Range -->
            <div class="row">
              <label for="startNum" class="lbl">Range:</label>
              <div class="controls-inline">
                <input id="startNum" class="num" type="number" v-model.number="startNum" min="1" inputmode="numeric" />
                <span class="dash">-</span>
                <input id="endNum" class="num" type="number" v-model.number="endNum" min="1" inputmode="numeric" />
              </div>
            </div>

            <!-- Line 2: Exclude -->
            <div class="row">
              <label for="excludeInput" class="lbl">Exclude:</label>
              <div class="controls-inline">
                <input id="excludeInput" class="ex-input" type="text" v-model.trim="excludeInput"
                  placeholder="e.g., 3,7,15" aria-label="Exclude numbers" />
              </div>
            </div>

            <!-- Line 3: Actions -->
            <div class="actions">
              <div class="actions-left">
                <button class="btn rand sm" type="button" :disabled="numbers.length === 0" @click="randomizeOrder"
                  aria-label="Randomize the order of values on the wheel">
                  Randomize
                </button>
              </div>
              <div class="actions-right">
                <button class="btn subtle sm" type="button" @click="closeSettings">Cancel</button>
                <button class="btn sm" type="submit">Update</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import { useRouter } from "vue-router";

import homeIcon from "@/assets/images/icons/back-icon.png";
import settingsIcon from "@/assets/images/icons/settings-icon.png";
import selectSfxUrl from "@/assets/sounds/Wood_Block.ogg";
import tickFuture from "@/assets/sounds/arcade_beep_01.mp3";

type SliceCenter = { index: number; angleDeg: number };

const router = useRouter();

const canvasEl = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;

const startNum = ref<number>(loadNum("rw_start", 1));
const endNum = ref<number>(loadNum("rw_end", 32));
const excludeInput = ref<string>(loadStr("rw_exclude", ""));
const numbers = ref<number[]>(loadNumbers());
const spinning = ref(false);
const popupOpen = ref(false);
const showSettings = ref(false);
const selectedNumber = ref<number | null>(null);

const wheelSize = ref<number>(calcWheelSize());

// Spin tuning
// Consistent duration; variable spin strength (turns)
const SPIN_DURATION_MS = 6000; // fixed so it "feels" consistent
const SPIN_TURNS_MIN = 1.25;
const SPIN_TURNS_MAX = 6.0;

// max segments on wheel
const MAX_SEGMENTS = 100;

// spin state
let startAngle = -Math.PI / 2;
let endAngle = startAngle;
let animStart = 0;
let animDuration = 0;
let rafId: number | null = null;

// sounds
const selectSfx = new Audio(selectSfxUrl);

// Tick engine
const tickMode = ref<"sample" | "synth">("sample");
const tickPlayStyle = ref<"single" | "cycle" | "random">("single");
const tickVolume = ref<number>(0.25);
const tickSoundUrls = ref<string[]>([tickFuture]);

let audioCtx: AudioContext | null = null;
let tickBuffers: AudioBuffer[] = [];
let tickCycleIdx = 0;

// highlight tracking
const topIndex = ref<number | null>(null);
let lastTickIndex: number | null = null;

const SHOW_CENTER_DEBUG = false;

// ---------- nav ----------
function goBack() { if (window.history.length > 1) router.back(); else router.push("/"); }

// ---------- storage ----------
function loadStr(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
function loadNum(key: string, fallback: number) {
  const raw = loadStr(key, String(fallback)); const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}
function loadNumbers(): number[] {
  try {
    const raw = localStorage.getItem("rw_numbers");
    if (!raw) return buildNumbersFromInputs(loadNum("rw_start", 1), loadNum("rw_end", 32), loadStr("rw_exclude", ""));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => Number.isInteger(x))) return parsed as number[];
  } catch { }
  return buildNumbersFromInputs(1, 32, "");
}
function saveInputs() {
  try {
    localStorage.setItem("rw_start", String(startNum.value));
    localStorage.setItem("rw_end", String(endNum.value));
    localStorage.setItem("rw_exclude", excludeInput.value);
  } catch { }
}
function saveNumbers() { try { localStorage.setItem("rw_numbers", JSON.stringify(numbers.value)); } catch { } }

// ---------- numbers ----------
function parseExclusions(s: string): number[] {
  return s.split(",").map((t) => Number(t.trim())).filter((n) => Number.isInteger(n));
}
function buildNumbersFromInputs(start: number, end: number, exclude: string): number[] {
  let a = Math.min(start, end), b = Math.max(start, end);
  const excl = new Set(parseExclusions(exclude));
  const out: number[] = [];
  for (let i = a; i <= b; i++) if (!excl.has(i)) out.push(i);
  return out;
}
function applyRange() {
  const newList = buildNumbersFromInputs(startNum.value, endNum.value, excludeInput.value);

  if (newList.length > MAX_SEGMENTS) {
    alert(`You must have ${MAX_SEGMENTS} segments or less.`);
    return;
  }

  saveInputs();
  if (JSON.stringify(newList) !== JSON.stringify(numbers.value)) {
    numbers.value = newList; saveNumbers(); drawWheel(currentAngle());
  }
}
function applyAndClose() { applyRange(); closeSettings(); }

function randomizeOrder() {
  if (!numbers.value.length) return;
  // Fisher–Yates shuffle
  for (let i = numbers.value.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers.value[i], numbers.value[j]] = [numbers.value[j], numbers.value[i]];
  }
  saveNumbers();
  drawWheel(currentAngle());
  closeSettings();
}


// ---------- responsive canvas ----------
function calcWheelSize(): number {
  const vw = Math.max(320, Math.min(window.innerWidth, 1600));
  const vh = Math.max(400, Math.min(window.innerHeight, 1200));
  const s = Math.round(Math.min(vw, vh) * 0.72);
  return Math.max(300, Math.min(720, s));
}
function setupCanvas(): void {
  const c = canvasEl.value; if (!c) return;
  const size = wheelSize.value; const dpr = window.devicePixelRatio || 1;
  c.style.width = size + "px"; c.style.height = size + "px";
  c.width = Math.floor(size * dpr); c.height = Math.floor(size * dpr);
  ctx = c.getContext("2d"); if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr);
}
function onResize() {
  const newSize = calcWheelSize();
  if (newSize !== wheelSize.value) { wheelSize.value = newSize; setupCanvas(); drawWheel(currentAngle()); }
}

// ---------- easing / angle ----------
function easeOutExpo(t: number): number { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function currentAngle(): number {
  if (!spinning.value) return endAngle;
  const now = performance.now(); const t = Math.min(1, (now - animStart) / animDuration);
  const eased = easeOutExpo(t); return startAngle + (endAngle - startAngle) * eased;
}
function sampleSpinTurns(): number {
  // Smooth non-linear mapping (smoothstep) gives nice variety across [min,max]
  const r = Math.random();
  const s = r * r * (3 - 2 * r); // 0..1, eased
  return SPIN_TURNS_MIN + s * (SPIN_TURNS_MAX - SPIN_TURNS_MIN);
}

// ---------- drawing ----------
function drawWheel(angleRad: number): number | null {
  const c = canvasEl.value; if (!c) return null;
  const k = ctx ?? c.getContext("2d"); if (!k) return null;

  const size = wheelSize.value; const w = size, h = size;
  k.clearRect(0, 0, w, h); if (numbers.value.length === 0) return null;

  const total = numbers.value.length; const sliceAngle = (2 * Math.PI) / total;
  const cx = w / 2, cy = h / 2; const radius = Math.round(size * 0.45);

  // determine top slice
  const centers: SliceCenter[] = [];
  for (let i = 0; i < total; i++) {
    const centerRad = angleRad + i * sliceAngle + sliceAngle / 2;
    const deg = ((centerRad * 180) / Math.PI + 360) % 360;
    centers.push({ index: i, angleDeg: deg });
  }
  const idxAtTop = getTopIndex(centers, 270); topIndex.value = idxAtTop;

  // palette
  const BASE_HUE = 210, HUE_WOBBLE = 8, SAT = 50, L_A = 62, L_B = 54;
  const now = performance.now(); const pulse = 0.62 + 0.38 * Math.abs(Math.sin(now / 160));

  for (let i = 0; i < total; i++) {
    const a0 = angleRad + i * sliceAngle, a1 = a0 + sliceAngle, mid = a0 + sliceAngle / 2;
    const hue = BASE_HUE + ((i % 4) - 1.5) * (HUE_WOBBLE / 1.0);
    const baseFill = `hsl(${hue} ${SAT}% ${i % 2 === 0 ? L_A : L_B}%)`;

    k.beginPath(); k.moveTo(cx, cy); k.arc(cx, cy, radius, a0, a1); k.closePath();

    if (i === idxAtTop) {
      const grad = k.createRadialGradient(cx, cy, radius * 0.18, cx, cy, radius);
      grad.addColorStop(0, `hsla(${hue} ${SAT + 10}% ${L_A + 8}% / ${0.9 * pulse})`);
      grad.addColorStop(1, `hsla(${hue} ${SAT + 10}% ${L_B - 8}% / ${0.92 * pulse})`);
      k.fillStyle = grad; k.shadowColor = `hsla(${hue} ${SAT + 25}% ${L_B - 14}% / ${0.9 * pulse})`;
      k.shadowBlur = 24 * pulse;
    } else { k.fillStyle = baseFill; k.shadowBlur = 0; }
    k.fill();

    k.strokeStyle = "rgba(0,0,0,.18)"; k.lineWidth = 1; k.stroke();

    if (i === idxAtTop) {
      k.save(); k.beginPath(); k.arc(cx, cy, radius, a0, a1);
      k.strokeStyle = "rgba(255,255,255,.95)"; k.lineWidth = Math.max(3, radius * 0.035);
      k.shadowColor = "rgba(160,200,255,.9)"; k.shadowBlur = 20; k.stroke(); k.restore();
    }

    k.save(); k.translate(cx, cy); k.rotate(mid); k.textAlign = "center"; k.textBaseline = "middle";
    const baseFont = Math.max(14, Math.min(22, radius * 0.12));
    const fontSize = i === idxAtTop ? baseFont * 1.35 : baseFont;
    k.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, Arial`;
    const labelR = radius - Math.max(34, radius * 0.2);

    if (i === idxAtTop) {
      k.lineJoin = "round"; k.miterLimit = 2; k.strokeStyle = "rgba(255,255,255,.95)";
      k.lineWidth = Math.max(3, fontSize * 0.14); k.strokeText(String(numbers.value[i]), labelR, 0);
      k.fillStyle = "#0b1a2b"; k.fillText(String(numbers.value[i]), labelR, 0);
    } else { k.fillStyle = "rgba(0,0,0,.82)"; k.fillText(String(numbers.value[i]), labelR, 0); }
    k.restore();
  }

  // center cap
  k.beginPath(); k.arc(cx, cy, Math.max(10, radius * 0.06), 0, 2 * Math.PI);
  const capGrad = k.createRadialGradient(cx, cy, 2, cx, cy, radius * 0.08);
  capGrad.addColorStop(0, "#ffffff"); capGrad.addColorStop(1, "#e8edf6");
  k.fillStyle = capGrad; k.fill(); k.strokeStyle = "rgba(0,0,0,.15)"; k.stroke();

  return idxAtTop;
}

function getTopIndex(centers: SliceCenter[], reference = 270): number | null {
  if (!centers.length) return null;
  let bestIdx = 0, bestDiff = 360;
  for (let i = 0; i < centers.length; i++) {
    let diff = Math.abs((centers[i].angleDeg - reference + 360) % 360);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  return centers[bestIdx].index;
}

// ---------- spin & ticks ----------
function spinWheel() {
  if (numbers.value.length === 0 || spinning.value || popupOpen.value || showSettings.value) return;
  const ctx = ensureAudio(); if (ctx) { void ensureTickBuffers(); }
  const extraTurns = sampleSpinTurns(); // vary strength
  const randomOffset = Math.random() * (2 * Math.PI); // vary final landing
  startAngle = currentAngle();
  endAngle = startAngle + extraTurns * (2 * Math.PI) + randomOffset;
  animDuration = SPIN_DURATION_MS; // fixed duration for consistent feel
  animStart = performance.now();
  spinning.value = true; lastTickIndex = null; rafId = requestAnimationFrame(animateSpin);
}
function animateSpin() {
  const now = performance.now(); const t = Math.min(1, (now - animStart) / animDuration);
  const ang = currentAngle();
  const idx = drawWheel(ang);
  if (idx !== null && idx !== lastTickIndex) { lastTickIndex = idx; playTick(); }
  if (t < 1) { rafId = requestAnimationFrame(animateSpin); }
  else {
    spinning.value = false; rafId && cancelAnimationFrame(rafId); rafId = null;
    drawWheel(endAngle); setTimeout(determineResult, 280);
  }
}
function determineResult() {
  if (numbers.value.length === 0) return;
  const total = numbers.value.length; const sliceAngle = (2 * Math.PI) / total;
  const centers: SliceCenter[] = [];
  for (let i = 0; i < total; i++) {
    const centerRad = endAngle + i * sliceAngle + sliceAngle / 2;
    const deg = ((centerRad * 180) / Math.PI + 360) % 360;
    centers.push({ index: i, angleDeg: deg });
  }
  const idx = getTopIndex(centers, 270); topIndex.value = idx;
  selectedNumber.value = idx == null ? null : numbers.value[idx] ?? null;
  try { const s = selectSfx; s.currentTime = 0; s.play(); } catch { }
  popupOpen.value = true;
}

// ---------- audio helpers ----------
function ensureAudio(): AudioContext | null {
  const AC: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  const ctx = audioCtx; if (ctx.state === "suspended") { void ctx.resume(); }
  return ctx;
}
async function loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
  const ctx = ensureAudio(); if (!ctx) return null;
  try { const res = await fetch(url); const data = await res.arrayBuffer(); const buf = await ctx.decodeAudioData(data); return buf; }
  catch { return null; }
}
async function ensureTickBuffers(): Promise<void> {
  if (tickBuffers.length || tickMode.value !== "sample") return;
  const urls = tickSoundUrls.value.slice();
  const bufs = await Promise.all(urls.map((u) => loadAudioBuffer(u)));
  tickBuffers = bufs.filter((b): b is AudioBuffer => !!b); tickCycleIdx = 0;
}
function chooseTickBuffer(): AudioBuffer | null {
  if (!tickBuffers.length) return null;
  if (tickPlayStyle.value === "single") return tickBuffers[0];
  if (tickPlayStyle.value === "random") { const i = Math.floor(Math.random() * tickBuffers.length); return tickBuffers[i]; }
  const buf = tickBuffers[tickCycleIdx % tickBuffers.length]; tickCycleIdx++; return buf;
}
function playTick() {
  const ctx = ensureAudio(); if (!ctx) return;
  if (tickMode.value === "sample" && tickBuffers.length) {
    const buf = chooseTickBuffer();
    if (buf) {
      const src = ctx.createBufferSource(); src.buffer = buf; const gain = ctx.createGain();
      gain.gain.value = tickVolume.value; src.connect(gain).connect(ctx.destination); src.start(); return;
    }
  }
  playSynthTick(ctx);
}
function playSynthTick(ctx: AudioContext) {
  const osc = ctx.createOscillator(); const gain = ctx.createGain(); const t = ctx.currentTime;
  const baseFreq = 1100; const jitter = (Math.random() - 0.5) * 120;
  osc.type = "square"; osc.frequency.setValueAtTime(baseFreq + jitter, t);
  const vol = Math.max(0.05, Math.min(1, tickVolume.value));
  gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(0.22 * vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  osc.connect(gain).connect(ctx.destination); osc.start(t); osc.stop(t + 0.08);
}

// ---------- modal helpers ----------
function openSettings() { showSettings.value = true; }
function closeSettings() { showSettings.value = false; }

// ---------- remove / close ----------
function removeSelected() {
  if (selectedNumber.value == null) return;
  numbers.value = numbers.value.filter((n) => n !== selectedNumber.value);
  saveNumbers(); popupOpen.value = false; drawWheel(currentAngle());
}
function closePopup() { popupOpen.value = false; }

// ---------- computed ----------
const selectedText = computed(() => (selectedNumber.value == null ? "" : String(selectedNumber.value)));

// ---------- lifecycle ----------
onMounted(() => {
  if (!numbers.value.length) { numbers.value = buildNumbersFromInputs(startNum.value, endNum.value, excludeInput.value); saveNumbers(); }
  setupCanvas(); drawWheel(endAngle);

  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Space" && !popupOpen.value && !showSettings.value) { e.preventDefault(); spinWheel(); }
    if (e.code === "Escape") { if (popupOpen.value) { e.preventDefault(); closePopup(); } else if (showSettings.value) { e.preventDefault(); closeSettings(); } }
  };
  const onResizeThrottled = throttle(onResize, 100);

  window.addEventListener("keydown", onKey);
  window.addEventListener("resize", onResizeThrottled);
  cleanupFns.push(() => window.removeEventListener("keydown", onKey));
  cleanupFns.push(() => window.removeEventListener("resize", onResizeThrottled));
});

watch([numbers, wheelSize], () => { setupCanvas(); drawWheel(currentAngle()); });

const cleanupFns: Array<() => void> = [];
onBeforeUnmount(() => { rafId && cancelAnimationFrame(rafId); cleanupFns.forEach((fn) => fn()); });

// ---------- utils ----------
function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let last = 0; let timeout: number | null = null;
  return function (this: any, ...args: any[]) {
    const now = Date.now();
    if (now - last >= wait) { last = now; fn.apply(this, args); }
    else if (!timeout) {
      timeout = window.setTimeout(() => { last = Date.now(); timeout = null; fn.apply(this, args); }, wait - (now - last));
    }
  } as T;
}
</script>

<style scoped>
.roulette-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Back/Home */
.home-button {
  position: fixed;
  top: 14px;
  left: 14px;
  width: 34px;
  height: 34px;
  z-index: 50;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.home-button img { width: 100%; height: auto; transition: transform .18s ease-in-out; }
.home-button img:hover { transform: scale(1.07); }

/* Settings (top-right) */
.settings-button {
  position: fixed;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  z-index: 50;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
.settings-button img {
  width: 100%;
  height: auto;
  transition: transform .18s ease-in-out;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .25));
}
.settings-button:hover img { transform: rotate(10deg) scale(1.05); }

/* Wheel center + size-aware spacing for spin button (unchanged visual) */
.wheel-container { flex: 1; display: grid; place-items: center; padding: 12px 0; }
.wheel-wrap { position: relative; width: var(--wheel-size, 560px); height: var(--wheel-size, 560px); cursor: pointer; }
.indicator {
  position: absolute; top: 6px; left: 50%; transform: translateX(-50%) rotate(180deg);
  width: 0; height: 0;
  border-left: 12px solid transparent; border-right: 12px solid transparent; border-bottom: 36px solid #ff3b30;
  z-index: 2; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .2));
}
.wheel {
  background: #fff; border-radius: 50%; display: block; width: 100%; height: 100%;
  box-shadow: 0 10px 28px rgba(28, 76, 178, .16), inset 0 0 0 8px rgba(255, 255, 255, .9), inset 0 0 0 10px rgba(0, 0, 0, .06);
}
.spin-btn {
  margin-top: clamp(4px, calc(var(--wheel-size) * 0.025), 16px);
  padding: 12px 22px; font-size: 17px; font-weight: 900; border: none; border-radius: 12px;
  background: linear-gradient(90deg, #6dd5fa, #3498db); color: #fff; cursor: pointer;
  transition: transform .15s ease, filter .2s ease, box-shadow .2s ease;
  box-shadow: 0 10px 20px rgba(24, 113, 194, .22); margin-bottom: 4px;
}
.spin-btn:hover { transform: translateY(-1px); filter: brightness(1.03); box-shadow: 0 12px 24px rgba(24, 113, 194, .25); }
.spin-btn:disabled { opacity: .6; cursor: not-allowed; }
.muted { color: #666; font-size: 14px; margin-top: 6px; }

/* =========================
   Popups (Result + Settings) — MODAL TOKENS
   ========================= */

/* Frosted glass fullscreen overlay */
.popup {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--modal-overlay-bg);
  -webkit-backdrop-filter: var(--modal-overlay-filter);
  backdrop-filter: var(--modal-overlay-filter);
  z-index: 100;
}

/* Card */
.popup-card {
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  padding: 18px 20px;
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  border: 1px solid var(--modal-border);
  min-width: 260px;
  text-align: center;
}

/* Result popup specifics */
.pop-value {
  margin: 0 0 12px;
  font-size: 44px;
  font-weight: 900;
  color: var(--modal-on-surface);
}
.pop-actions { display: flex; gap: 10px; justify-content: center; }

/* Settings modal sizing */
.settings-card { width: min(420px, 92vw); text-align: left; }
.settings-title { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: var(--modal-on-surface); }

/* Form */
.settings-form { display: grid; gap: 10px; }
.row {
  display: grid;
  grid-template-columns: 84px 1fr;
  align-items: center;
  column-gap: 10px;
}
.lbl { font-weight: 700; justify-self: end; color: var(--modal-on-surface); }
.controls-inline { display: inline-flex; align-items: center; gap: 8px; flex-wrap: nowrap; }
.dash { opacity: 0.75; color: var(--modal-on-surface-soft); }

/* Inputs — modal surface/border/text */
.num,
.ex-input {
  width: clamp(96px, 16vw, 108px);
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 15px;
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  outline: none;
  box-shadow: 0 0 0 0 rgba(0,0,0,0);
  transition: box-shadow .15s ease, border-color .15s ease;
}
.ex-input { width: clamp(160px, 60vw, 260px); }
.num:focus,
.ex-input:focus {
  box-shadow: var(--focus-ring);
  border-color: color-mix(in srgb, var(--modal-accent) 40%, var(--modal-border) 60%);
}

/* Actions row */
.actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }
.actions-left, .actions-right { display: inline-flex; gap: 8px; }

/* Buttons — modal accents */
/* Buttons — solid token fills (no animations) */
.btn {
  padding: 9px 14px;
  font-size: 14px;
  font-weight: 800;
  border-radius: 9px;
  cursor: pointer;

  /* Solid accent fill */
  background: var(--modal-accent);
  color: #000; /* keep text black */
  border: 2px solid color-mix(in srgb, var(--modal-accent) 70%, var(--modal-border) 30%);
  box-shadow: 0 3px 10px rgba(0,0,0,.12);

  transition:
    transform .10s ease,
    filter .15s ease,
    border-color .15s ease,
    box-shadow .15s ease;
}
.btn:hover {
  transform: translateY(-1px);
  filter: brightness(0.98);
  border-color: color-mix(in srgb, var(--modal-accent) 80%, var(--modal-border) 20%);
  box-shadow: 0 4px 12px rgba(0,0,0,.16);
}
.btn:active { transform: translateY(0); }
.btn:disabled { opacity: .5; cursor: not-allowed; }

.btn.sm { padding: 7px 12px; font-size: 13px; border-radius: 8px; }

/* Subtle button (neutral within modal) */
.btn.subtle {
  background: color-mix(in srgb, var(--modal-on-surface) 6%, var(--modal-surface) 94%);
  color: #000; /* keep text black */
  border: 2px solid var(--modal-border);
  box-shadow: none;
}
.btn.subtle:hover {
  background: color-mix(in srgb, var(--modal-on-surface) 10%, var(--modal-surface) 90%);
}

/* Randomize uses secondary modal accent */
.btn.rand {
  background: var(--modal-accent-2);
  color: #000; /* keep text black */
  border: 2px solid color-mix(in srgb, var(--modal-accent-2) 70%, var(--modal-border) 30%);
  box-shadow: 0 3px 10px rgba(0,0,0,.14);
}
.btn.rand:hover {
  filter: brightness(0.98);
  border-color: color-mix(in srgb, var(--modal-accent-2) 80%, var(--modal-border) 20%);
  box-shadow: 0 4px 12px rgba(0,0,0,.16);
}


/* Transitions */
.fade-zoom-enter-active,
.fade-zoom-leave-active { transition: opacity .18s ease, transform .18s ease; }
.fade-zoom-enter-from,
.fade-zoom-leave-to { opacity: 0; transform: scale(.98); }

/* Mobile tweaks */
@media (max-width: 420px) {
  .settings-card { width: min(360px, 94vw); }
  .row { grid-template-columns: 74px 1fr; }
  .num { width: 84px; }
  .ex-input { width: clamp(150px, 70vw, 220px); }
}
</style>
