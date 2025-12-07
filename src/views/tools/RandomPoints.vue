<!-- src/components/RandomPoints.vue -->
<template>
  <section
    class="random-points-page app-bg"
    :style="rootVars"
  >
    <!-- Top Left: Back -->
    <button class="icon-btn back" type="button" @click="onExit" aria-label="Back" title="Back">
      <img class="icon" src="@/assets/images/icons/back-icon.png" alt="" />
    </button>

    <!-- Top Right: Settings -->
    <button
      class="icon-btn settings"
      type="button"
      @click="toggleSettingsMenu"
      aria-haspopup="dialog"
      :aria-expanded="showSettings"
      aria-controls="settings-menu"
      aria-label="Open settings"
      title="Settings"
    >
      <img class="icon" src="@/assets/images/icons/settings-icon.png" alt="" />
    </button>

    <!-- SETTINGS OVERLAY + MENU -->
    <div
      v-if="showSettings"
      class="settings-overlay"
      role="presentation"
      @click="showSettings=false"
    >
      <div
        id="settings-menu"
        class="settings-menu"
        role="dialog"
        aria-modal="true"
        @click.stop
      >
        <h3 class="menu-title">Settings</h3>

        <label class="menu-row">
          <input type="checkbox" v-model="allowNegatives" />
          <span>Negative Numbers</span>
        </label>

        <label class="menu-row">
          <input type="checkbox" v-model="doublePoints" />
          <span>Double Points</span>
        </label>

        <label class="menu-row">
          <input type="checkbox" v-model="allowSpecial" />
          <span>Special Cards (Swap Up/Down/Choice)</span>
        </label>

        <!-- Single toggle button (no 'SFX' label) -->
        <div class="mute-row">
          <button
            class="mute-btn"
            :aria-pressed="sfxMuted"
            @click="toggleMute"
          >
            {{ sfxMuted ? "Unmute SFX" : "Mute SFX" }}
          </button>
        </div>

        <button class="apply" @click="applySettings">Apply</button>
      </div>
    </div>

    <h1 class="title">Random Points</h1>

    <!-- Column labels -->
    <div
      class="labels"
      :style="labelsInlineStyle"
    >
      <div></div>
      <div v-for="label in columnLabels" :key="label" class="label-cell">{{ label }}</div>
    </div>

    <!-- Grid -->
    <div
      class="grid"
      :style="gridInlineStyle"
    >
      <template v-for="r in rows" :key="`r-${r}`">
        <!-- Row label -->
        <div class="label-cell row">{{ r }}</div>

        <!-- Cards -->
        <div v-for="c in cols" :key="`c-${r}-${c}`" class="grid-item">
          <div
            class="card"
            role="button"
            tabindex="0"
            @click.stop="reveal(cellAt(r,c))"
            @keydown.enter.prevent="reveal(cellAt(r,c))"
            @keydown.space.prevent="reveal(cellAt(r,c))"
          >
            <div class="flip-inner" :class="{ revealed: cellAt(r,c).revealed }">
              <!-- FRONT (green back) -->
              <div class="face front"></div>

              <!-- BACK (revealed value) -->
              <div class="face back">
                <span class="value" :class="valueClass(cellAt(r,c).value)">
                  {{ cellAt(r,c).display }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="controls">
      <button class="big-btn" @click="reset">Reset</button>
      <button class="big-btn" @click="revealAll">See All</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from "vue";
import { useRouter } from "vue-router";

/* --- SFX --- */
import sndPositive from "@/assets/sounds/fortunegame/chukichi.mp3";
import sndNegative from "@/assets/sounds/fortunegame/kyo.mp3";
import sndSwap from "@/assets/sounds/fortunegame/shokichi.mp3";
import sndLoseAll from "@/assets/sounds/fortunegame/daikyo.mp3";
import sndFifty from "@/assets/sounds/fortunegame/daikichi.mp3";

type Special = "Lose All" | "Swap Up" | "Swap Down" | "Swap Choice";
type CellValue = number | Special;
type Cell = { id: number; value: CellValue; display: string; revealed: boolean };

const rows = 4;
const cols = 6;
const totalCells = rows * cols;
const columnLabels = ["A", "B", "C", "D", "E", "F"];

const router = useRouter();
const onExit = () => router.back();

const showSettings = ref(false);
const allowNegatives = ref(true);
const doublePoints = ref(false);
const allowSpecial = ref(true);

/* SFX controls */
const BASE_SFX_VOL = 0.35;
const sfxMuted = ref(false);

/* Persisted settings key */
const LS_KEY = "random-points-settings";

/* pre-allocate cells */
const cells = ref<Cell[]>(
  Array.from({ length: totalCells }, (_, i) => ({
    id: i,
    value: 0,
    display: "",
    revealed: false,
  }))
);

/* viewport-fit */
const gridPaddingTop = 150;
const gridPaddingBottom = 110;

const viewportH = ref<number>(typeof window !== "undefined" ? window.innerHeight : 800);
const viewportW = ref<number>(typeof window !== "undefined" ? window.innerWidth : 1280);

/** Responsive label column width and gaps (keep everything on-screen) */
const labelColW = computed(() => {
  const w = viewportW.value;
  if (w <= 360) return 22;
  if (w <= 420) return 24;
  if (w <= 520) return 26;
  if (w <= 680) return 28;
  return 30;
});
const gapPx = computed(() => {
  const w = viewportW.value;
  if (w <= 360) return 6;
  if (w <= 420) return 7;
  if (w <= 520) return 8;
  if (w <= 680) return 9;
  return 10;
});

/** Root CSS vars (used by styles) */
const rootVars = computed(() => ({
  "--labelW": `${labelColW.value}px`,
  "--gap": `${gapPx.value}px`,
}));

/** Grid/labels sizes */
const gridInlineStyle = computed(() => {
  const usableH = Math.max(320, viewportH.value - gridPaddingTop - gridPaddingBottom);
  return {
    height: `${usableH}px`,
    gridTemplateColumns: `var(--labelW) repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: `var(--gap)`,
  } as Record<string, string>;
});

const labelsInlineStyle = computed(() => {
  return {
    gridTemplateColumns: `var(--labelW) repeat(${cols}, 1fr)`,
    gap: `var(--gap)`,
  } as Record<string, string>;
});

/* helpers */
const cellIndex = (r: number, c: number) => (r - 1) * cols + (c - 1);
const cellAt = (r: number, c: number) => cells.value[cellIndex(r, c)];
const isSpecial = (v: CellValue): boolean => typeof v !== "number";

function valueClass(v: CellValue) {
  if (typeof v === "number") {
    return v > 0 ? "val-pos" : v < 0 ? "val-neg" : "val-zero";
  }
  if (v === "Lose All") return "val-lose val-text";
  return "val-swap val-text";
}
function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* sfx instances */
const sfx = {
  positive: new Audio(sndPositive),
  negative: new Audio(sndNegative),
  swap: new Audio(sndSwap),
  loseAll: new Audio(sndLoseAll),
  fifty: new Audio(sndFifty),
};
function applySfxVolume() {
  const vol = sfxMuted.value ? 0 : BASE_SFX_VOL;
  sfx.positive.volume = vol;
  sfx.negative.volume = vol;
  sfx.swap.volume = vol;
  sfx.loseAll.volume = vol;
  sfx.fifty.volume = vol;
}
function play(type: keyof typeof sfx) {
  const a = sfx[type];
  try { a.currentTime = 0; void a.play(); } catch {}
}
function toggleMute() {
  sfxMuted.value = !sfxMuted.value;
  applySfxVolume();
  saveSettings();
}

/* generation */
function generateValues(): CellValue[] {
  const out: CellValue[] = [];

  const jackpot = doublePoints.value ? 100 : 50;
  out.push(jackpot);

  if (allowSpecial.value && allowNegatives.value) {
    out.push("Lose All");
  }

  const swapCount = allowSpecial.value ? rng(1, 5) : 0;
  for (let i = 0; i < swapCount; i++) {
    const r = Math.random();
    if (r < 0.45) out.push("Swap Up");
    else if (r < 0.9) out.push("Swap Down");
    else out.push("Swap Choice");
  }

  const remain = totalCells - out.length;
  let posCount = remain;
  let negCount = 0;
  if (allowNegatives.value) {
    posCount = Math.floor(remain * 0.6);
    negCount = remain - posCount;
  }
  for (let i = 0; i < posCount; i++) {
    const base = 5 * rng(1, 5);
    out.push(doublePoints.value ? base * 2 : base);
  }
  for (let i = 0; i < negCount; i++) {
    const base = -5 * rng(1, 5);
    out.push(doublePoints.value ? base * 2 : base);
  }

  // shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildCells() {
  const values = generateValues();
  for (let i = 0; i < totalCells; i++) {
    const v = values[i];
    const c = cells.value[i];
    c.value = v;
    c.display = typeof v === "number" ? String(v) : v;
    c.revealed = false;
  }
}

/* actions */
function reveal(cell: Cell) {
  if (!cell || cell.revealed) return;

  // sfx first
  if (typeof cell.value === "string") {
    if (cell.value === "Lose All") play("loseAll");
    else play("swap");
  } else {
    const jackpot = doublePoints.value ? 100 : 50;
    if (cell.value === jackpot) play("fifty");
    else if (cell.value > 0) play("positive");
    else play("negative");
  }

  // then flip
  cell.revealed = true;
}

function revealAll() { for (const c of cells.value) c.revealed = true; }
function reset() { buildCells(); }
function toggleSettingsMenu() { showSettings.value = !showSettings.value; }
function saveSettings() {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      allowNegatives: allowNegatives.value,
      doublePoints: doublePoints.value,
      allowSpecial: allowSpecial.value,
      sfxMuted: sfxMuted.value,
    })
  );
}
function applySettings() {
  saveSettings();
  buildCells();
  showSettings.value = false;
}

/* lifecycle */
function handleResize() {
  viewportH.value = window.innerHeight;
  viewportW.value = window.innerWidth;
}
onMounted(() => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (typeof saved.allowNegatives === "boolean") allowNegatives.value = saved.allowNegatives;
      if (typeof saved.doublePoints === "boolean") doublePoints.value = saved.doublePoints;
      if (typeof saved.allowSpecial === "boolean") allowSpecial.value = saved.allowSpecial;
      if (typeof saved.sfxMuted === "boolean") sfxMuted.value = saved.sfxMuted;
    }
  } catch {}

  applySfxVolume();
  buildCells();
  handleResize();
  window.addEventListener("resize", handleResize, { passive: true });
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
/* Page */
.random-points-page {
  --icon-size: 34px;
  --z-icons: 1002;
  --z-menu: 1001;

  position: relative;
  min-height: 100vh;
  padding: 16px 14px 0;
  display: flex;
  flex-direction: column;
  align-items: center;

  overflow-x: hidden;
}

/* Icon buttons */
.icon-btn {
  position: absolute;
  display: inline-grid;
  place-items: center;
  width: var(--icon-size) !important;
  height: var(--icon-size) !important;
  background: transparent;
  border: none;
  padding: 0;
  line-height: 0;
  z-index: var(--z-icons);
  cursor: pointer;
  box-sizing: content-box;
  transition: transform .12s ease;
}
.icon-btn .icon { width: 100%; height: 100%; object-fit: contain; display: block; }
.icon-btn.back { top: 12px; left: 12px; right: auto !important; }
.icon-btn.settings { top: 12px; right: 12px; left: auto !important; }

/* Hover effects for icons (desktop only) */
@media (hover:hover) and (pointer:fine) {
  .icon-btn:hover { transform: scale(1.1); }
  .icon-btn.settings:hover { transform: scale(1.1) rotate(10deg); }
}

/* Settings overlay (backdrop uses modal tokens for consistency) */
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-menu);
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
}

/* Settings menu (modal card at top-right) */
.settings-menu {
  position: fixed;
  top: calc(12px + var(--icon-size) + 10px);
  right: 12px;
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  border: 1px solid var(--modal-border);
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  width: 260px;
}
.menu-title {
  margin: 2px 0 10px;
  font-size: 20px;
  text-align: center;
  color: var(--modal-on-surface);
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0;
  font-size: 14px;
  color: var(--modal-on-surface);
}
.menu-row input[type="checkbox"] {
  accent-color: var(--accent-secondary);
}

/* Single mute toggle row */
.mute-row { display: flex; justify-content: center; margin-top: 10px; }
.mute-btn {
  padding: 8px 12px;
  border: 1px solid var(--btn-ghost-border);
  border-radius: var(--radius-sm);
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  cursor: pointer;
  font-weight: 800;
  box-shadow: var(--elevation-1);
  transition: transform .12s ease, box-shadow .12s ease, background .12s ease, color .12s ease, border-color .12s ease;
}
@media (hover:hover) and (pointer:fine) {
  .mute-btn:hover { transform: translateY(-1px); box-shadow: var(--elevation-2); }
}
.mute-btn[aria-pressed="true"] {
  background: color-mix(in srgb, var(--accent-danger) 16%, var(--neutral-0) 84%);
  color: var(--modal-on-surface);
  border-color: var(--btn-danger-border);
}

/* Apply button (primary) */
.settings-menu .apply {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--btn-primary-border);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  cursor: pointer;
  font-weight: 800;
  box-shadow: var(--elevation-1);
}

/* Title + labels (sit over global background) */
.title {
  margin: 54px 0 10px;
  font-size: var(--main-title-size);
  color: var(--main-title-color);
  font-weight: 900;
  text-shadow: var(--main-title-shadow);
}

/* Labels row */
.labels {
  display: grid;
  width: 100%;
  max-width: 1200px;
  user-select: none;
  color: var(--main-text-color);
  text-shadow: var(--main-title-shadow);
}
.label-cell {
  display: grid; place-items: center; font-weight: 800;
  color: var(--main-text-color);
  text-shadow: var(--main-title-shadow);
  font-size: clamp(18px, 3.8vw, 28px);
  line-height: 1;
  padding: 4px 0;
}


/* Grid */
.grid {
  width: 100%;
  max-width: 1200px;
  margin-top: 4px;
  display: grid;
  grid-auto-flow: row;
  user-select: none;
  padding: 5px;
  overflow: hidden;
  /* subtle card container contrast over app bg */
  border-radius: var(--table-radius);
}

/* Card + hover */
.card {
  width: 100%;
  height: 100%;
  border-radius: var(--table-radius);
  perspective: 1000px;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
  outline: none;
}
.card:focus-visible { box-shadow: var(--focus-ring); }
@media (hover:hover) and (pointer:fine) {
  .card:hover { transform: scale(1.03); box-shadow: var(--table-shadow); }
}

/* Flipper (true 2-sided flip) */
.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 380ms cubic-bezier(.2,.65,.2,1);
  will-change: transform;
}
.flip-inner.revealed { transform: rotateY(180deg); }

/* Faces */
.face {
  position: absolute;
  inset: 0;
  border-radius: var(--table-radius);
  border: 1px solid var(--table-border);
  display: grid;
  place-items: center;
  backface-visibility: hidden;
  background: var(--table-surface);
  color: var(--table-on-surface);
  box-shadow: var(--table-shadow);
}

/* FRONT: the (green) card back using success accent gradient */
.face.front {
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-success) 86%, var(--neutral-0) 14%),
      color-mix(in srgb, var(--accent-success) 62%, var(--neutral-900) 38%)
    );
  border-color: color-mix(in srgb, var(--accent-success) 55%, var(--neutral-900) 45%);
  transform: rotateY(0deg);
}

/* BACK: the revealed value face */
.face.back {
  transform: rotateY(180deg);
  background: var(--table-surface);
  padding: 6px;
}

/* Value colors — mapped to theme tokens */
.value {
  font-weight: 900;
  font-size: clamp(1.9rem, 4.2vw, 40px);
  text-align: center;
  padding: 6px 8px;
  line-height: 1.08;
  user-select: none;
  color: var(--table-on-surface);
}
.value.val-pos  { color: var(--accent-success); }
.value.val-neg  { color: var(--accent-danger); }
.value.val-lose { color: var(--accent-danger); }
.value.val-swap { color: var(--accent-primary); }
.value.val-zero { color: var(--modal-on-surface-muted); }

/* Special cards: responsive wrapping */
.value.val-text {
  font-size: clamp(0.6rem, 3.6vw, 28px);
  line-height: 1.05;
  padding: 4px 6px;
  display: inline-block;
  max-width: 90%;
  white-space: normal;
  word-break: break-word;
  hyphens: auto;
  text-wrap: balance;
}

@media (max-width: 380px) {
  .value.val-text {
    font-size: clamp(1.05rem, 3.4vw, 24px);
    max-width: 95%;
  }
}

/* Controls */
.controls {
  margin: 12px 0 16px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.big-btn {
  font-size: clamp(16px, 2.6vw, 20px);
  padding: 12px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--btn-primary-border);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--elevation-1);
  transition: transform .15s ease, box-shadow .15s ease;
}
.big-btn:hover { transform: translateY(-1px); box-shadow: var(--elevation-2); }
.big-btn:active { transform: translateY(0); box-shadow: var(--elevation-1); }

/* Tiny tweak for very small screens */
@media (max-width: 420px) {
  .title { margin-top: 50px; }
}
</style>
