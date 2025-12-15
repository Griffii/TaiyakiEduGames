<!-- src/components/RandomPoints.vue -->
<template>
  <section class="random-points-page app-bg" :style="rootVars">
    <!-- Team Points Tracker Component -->
    <TeamPointsTracker ref="teamTracker" @team-selected="onTeamSelected" />

    <!-- Top Left: Back -->
    <button class="icon-btn back" type="button" @click="onExit" aria-label="Back" title="Back">
      <img class="icon" src="@/assets/images/icons/back-icon.png" alt="" />
    </button>

    <!-- Top Right: Settings -->
    <button class="icon-btn settings" type="button" @click="toggleSettingsMenu" aria-haspopup="dialog"
      :aria-expanded="showSettings" aria-controls="settings-menu" aria-label="Open settings" title="Settings">
      <img class="icon" src="@/assets/images/icons/settings-icon.png" alt="" />
    </button>

    <!-- Top Right: Mystery Machine button -->
    <button class="icon-btn mystery" type="button" @click="showMysteryMachine = true" aria-label="Open Mystery Machine"
      title="Mystery Machine">
      <img class="icon" src="@/assets/images/games/mystery-machine/mystery-machine-icon.png" alt="">
    </button>

    <!-- Mystery Machine Modal -->
    <MysteryMachine v-if="showMysteryMachine" :maxWager="maxWager" @close="onMysteryClosed"
      @resolved="onMysteryResolved" @effect-opened="onEffectOpened" />

    <!-- SETTINGS OVERLAY + MENU -->
    <div v-if="showSettings" class="settings-overlay" role="presentation" @click="showSettings = false">
      <div id="settings-menu" class="settings-menu" role="dialog" aria-modal="true" @click.stop>
        <h3 class="menu-title">Settings</h3>

        <label class="menu-row">
          <input type="checkbox" v-model="allowNegatives" />
          <span>Negative Numbers</span>
        </label>

        <label class="menu-row">
          <input type="checkbox" v-model="doublePoints" />
          <span>Double Points</span>
        </label>

        <!-- Tornado toggle -->
        <label class="menu-row">
          <input type="checkbox" v-model="allowTornado" />
          <span>Tornado Cards</span>
        </label>

        <label class="menu-row">
          <input type="checkbox" v-model="allowSpecial" />
          <span>Mystery Machine Cards</span>
        </label>

        <!-- Single toggle button (no 'SFX' label) -->
        <div class="mute-row">
          <button class="mute-btn" :aria-pressed="sfxMuted" @click="toggleMute">
            {{ sfxMuted ? "Unmute SFX" : "Mute SFX" }}
          </button>
        </div>

        <button class="apply" @click="applySettings">Apply</button>
      </div>
    </div>


    <h1 class="title"></h1>

    <!-- Column labels -->
    <div class="labels" :style="labelsInlineStyle">
      <div></div>
      <div v-for="label in columnLabels" :key="label" class="label-cell">{{ label }}</div>
    </div>

    <!-- Grid -->
    <div class="grid" :style="gridInlineStyle">
      <template v-for="r in rows" :key="`r-${r}`">
        <!-- Row label -->
        <div class="label-cell row">{{ r }}</div>

        <!-- Cards -->
        <div v-for="c in cols" :key="`c-${r}-${c}`" class="grid-item">
          <div class="card" :class="{
            'mystery-card': isMystery(cellAt(r, c).value),
            'mystery-card--revealed': isMystery(cellAt(r, c).value) && cellAt(r, c).revealed,
            'tornado-card': isTornado(cellAt(r, c).value),
            'tornado-card--revealed': isTornado(cellAt(r, c).value) && cellAt(r, c).revealed
          }" role="button" tabindex="0" @click.stop="reveal(cellAt(r, c))" @keydown.enter.prevent="reveal(cellAt(r, c))"
            @keydown.space.prevent="reveal(cellAt(r, c))">
            <div class="flip-inner" :class="{ revealed: cellAt(r, c).revealed }">
              <!-- FRONT (green back) -->
              <div class="face front"></div>

              <!-- BACK (revealed value) -->
              <div class="face back">
                <span class="value" :class="valueClass(cellAt(r, c).value)">
                  {{ cellAt(r, c).display }}
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
import MysteryMachine from "@/components/MysteryMachine.vue";
import TeamPointsTracker from "@/components/TeamPointsTracker.vue";

/* --- SFX --- */
import sndPositive from "@/assets/sounds/fortunegame/chukichi.mp3";
import sndNegative from "@/assets/sounds/fortunegame/kyo.mp3";
import sndSwap from "@/assets/sounds/spinning_sfx.mp3";
import sndLoseAll from "@/assets/sounds/fortunegame/daikyo.mp3";
import sndJackpot from "@/assets/sounds/fortunegame/daikichi.mp3";
import sndMystery from "@/assets/sounds/mystery-machine.mp3";

type Special = "Mystery Machine" | "Tornado";
type CellValue = number | Special;
type Cell = { id: number; value: CellValue; display: string; revealed: boolean };

/**
 * Minimal local view of a held power, just enough for RandomPoints
 * to check IDs without importing TeamPointsTracker's full types.
 */
interface HeldPowerLite {
  id: string;
  label?: string;
  tier?: number;
  source?: string;
  wager?: number;
  expires?: "next-round" | "one-shot" | "persistent";
  scope?: "next-card" | "round";
}

/**
 * Mystery Machine payloads
 */
interface MysteryEffectPayload {
  id: string;
  tier: number;
  label: string;
}

interface MysteryResultPayload {
  wager: number;
  pointsDelta: number;
  tier: number;
  wagerOutcome: { type: string; label: string };
  effect: MysteryEffectPayload;
}

/* ---------------------------
 * Local state
 * ------------------------- */

const showMysteryMachine = ref(false);

// Team points tracker ref + selection state
const teamTracker = ref<InstanceType<typeof TeamPointsTracker> | null>(null);
const hasSelectedTeam = ref(false);

// Optionally pass a max wager (team score, etc)
const maxWager = ref<number | null>(null);

/* Settings */
const showSettings = ref(false);
const allowNegatives = ref(true);
const doublePoints = ref(false);
const allowSpecial = ref(true);
const allowTornado = ref(false);
const showMysteryOverlay = ref(false);

/* SFX controls */
const BASE_SFX_VOL = 0.35;
const sfxMuted = ref(false);

/* Persisted settings key */
const LS_KEY = "random-points-settings";

/* Grid geometry */
const rows = 4;
const cols = 6;
const totalCells = rows * cols;
const columnLabels = ["A", "B", "C", "D", "E", "F"];

/* Cells */
const cells = ref<Cell[]>(
  Array.from({ length: totalCells }, (_, i) => ({
    id: i,
    value: 0,
    display: "",
    revealed: false,
  })),
);

/* viewport-fit */
const gridPaddingTop = 150;
const gridPaddingBottom = 110;

const viewportH = ref<number>(typeof window !== "undefined" ? window.innerHeight : 800);
const viewportW = ref<number>(typeof window !== "undefined" ? window.innerWidth : 1280);

/* ---------------------------
 * Router / navigation
 * ------------------------- */

const router = useRouter();
const onExit = () => router.back();

/* ---------------------------
 * Mystery Machine integration
 * ------------------------- */

// Close handler
function onMysteryClosed() {
  showMysteryMachine.value = false;
}

/**
 * Read currently held powers for the selected team.
 */
function getSelectedTeamPowers(): HeldPowerLite[] {
  const tracker: any = teamTracker.value;
  if (!tracker || typeof tracker.getHeldPowersForSelected !== "function") return [];
  const powers = tracker.getHeldPowersForSelected();
  if (!Array.isArray(powers)) return [];
  return powers as HeldPowerLite[];
}

function selectedTeamHasPower(id: string): boolean {
  return getSelectedTeamPowers().some((p) => p.id === id);
}

/**
 * Apply 2x / 3x next card powers, if present, and consume them.
 * Returns the final delta that should be added to the team.
 */
function applyCardPowersToDelta(baseValue: number): number {
  const tracker: any = teamTracker.value;
  const powers = getSelectedTeamPowers();

  const hasTripleNext = powers.some((p) => p.id === "t3_triple_next");
  const hasDoubleNext = powers.some((p) => p.id === "t2_double_next");

  let multiplier = 1;

  // Triple has priority over Double if somehow both are present
  if (hasTripleNext) {
    multiplier = 3;
  } else if (hasDoubleNext) {
    multiplier = 2;
  }

  const finalDelta = baseValue * multiplier;

  // Consume whichever power was applied (if TeamPointsTracker exposes it)
  if (
    multiplier > 1 &&
    tracker &&
    typeof tracker.consumeHeldPower === "function"
  ) {
    const usedId = hasTripleNext ? "t3_triple_next" : "t2_double_next";
    tracker.consumeHeldPower(usedId);
  }

  return finalDelta;
}

/**
 * When the prize card modal is opened in MysteryMachine.
 * Decide which effects are immediate vs. stored as chips.
 */
function onEffectOpened(result: MysteryResultPayload) {
  if (!result || !result.effect) return;
  if (!hasSelectedTeam.value || !teamTracker.value) return;

  const tracker: any = teamTracker.value;

  const payload = {
    id: result.effect.id,
    tier: result.effect.tier,
    label: result.effect.label,
    source: "mystery" as const,
    wager: result.wager,
  };

  // Let the tracker decide if it's immediate.
  // If it returns true, it already applied it / opened the picker.
  if (typeof tracker.resolveImmediateMysteryEffect === "function") {
    const handled = tracker.resolveImmediateMysteryEffect(payload);
    if (handled) return;
  }

  // Otherwise store as a held chip (round power-up)
  if (typeof tracker.addPrizeToSelected === "function") {
    tracker.addPrizeToSelected(payload);
  }
}


/**
 * When the MysteryMachine resolves (wager outcome).
 * We only care about the points delta here.
 */
function onMysteryResolved(result: MysteryResultPayload) {
  if (!result || typeof result.pointsDelta !== "number") return;
  if (!hasSelectedTeam.value) return;

  const delta = result.pointsDelta;
  if (delta === 0) return; // nothing to change

  // Apply the result to the currently selected team
  teamTracker.value?.applyDeltaToSelected(delta);
}

/* ---------------------------
 * Team / round controls
 * ------------------------- */
function onTeamSelected(team: any | null) {
  hasSelectedTeam.value = !!team;
}

/* ---------------------------
 * Layout + CSS var helpers
 * ------------------------- */

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

/* ---------------------------
 * Cell helpers
 * ------------------------- */

const cellIndex = (r: number, c: number) => (r - 1) * cols + (c - 1);
const cellAt = (r: number, c: number) => cells.value[cellIndex(r, c)];
const isSpecial = (v: CellValue): boolean => typeof v !== "number";
const isMystery = (v: CellValue): boolean => v === "Mystery Machine";
const isTornado = (v: CellValue): boolean => v === "Tornado";


function valueClass(v: CellValue) {
  if (typeof v === "number") {
    return v > 0 ? "val-pos" : v < 0 ? "val-neg" : "val-zero";
  }

  if (v === "Mystery Machine") {
    return "val-mystery val-text";
  }

  if (v === "Tornado") {
    // Dark grey text, separate from mystery styling
    return "val-tornado val-text";
  }

  // fallback for any other future special text
  return "val-text";
}


function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ---------------------------
 * SFX
 * ------------------------- */

const sfx = {
  positive: new Audio(sndPositive),
  negative: new Audio(sndNegative),
  swap: new Audio(sndSwap),
  loseAll: new Audio(sndLoseAll),
  jackpot: new Audio(sndJackpot),
  mystery: new Audio(sndMystery),
};

function applySfxVolume() {
  const vol = sfxMuted.value ? 0 : BASE_SFX_VOL;
  sfx.positive.volume = vol;
  sfx.negative.volume = vol;
  sfx.swap.volume = vol;
  sfx.loseAll.volume = vol;
  sfx.jackpot.volume = vol;
  sfx.mystery.volume = vol;
}

function play(type: keyof typeof sfx) {
  const a = sfx[type];
  try {
    a.currentTime = 0;
    void a.play();
  } catch {
    // ignore play errors (autoplay restrictions, etc.)
  }
}

function toggleMute() {
  sfxMuted.value = !sfxMuted.value;
  applySfxVolume();
  saveSettings();
}

/* ---------------------------
 * Board generation
 * ------------------------- */

function generateValues(): CellValue[] {
  const out: CellValue[] = [];

  // Always guarantee at least one max-value positive card.
  const jackpotBase = 100;
  const jackpotValue = doublePoints.value ? jackpotBase * 2 : jackpotBase;
  out.push(jackpotValue);

  // Remaining capacity after jackpot
  let available = totalCells - out.length;

  // Mystery Machine specials: 2–4 cards when enabled
  if (allowSpecial.value && available > 0) {
    const desiredMM = rng(2, 4); // 2–4 Mystery Machine cards
    const mmCount = Math.min(desiredMM, available);
    for (let i = 0; i < mmCount; i++) {
      out.push("Mystery Machine");
    }
    available = totalCells - out.length;
  }

  // Tornado specials: 2–4 cards when enabled
  if (allowTornado.value && available > 0) {
    const desiredTornado = rng(2, 4); // 2–4 Tornado cards
    const tCount = Math.min(desiredTornado, available);
    for (let i = 0; i < tCount; i++) {
      out.push("Tornado");
    }
    available = totalCells - out.length;
  }

  const remain = totalCells - out.length;

  // Split remaining cells into positive / negative when negatives are allowed
  let posCount = remain;
  let negCount = 0;
  if (allowNegatives.value) {
    posCount = Math.floor(remain * 0.7); // 70% positive cards when negatives are active
    negCount = remain - posCount;
  }

  // Positive values: 10–100 in multiples of 10 (base).
  for (let i = 0; i < posCount; i++) {
    const base = 10 * rng(1, 10); // 10, 20, ..., 100
    const val = doublePoints.value ? base * 2 : base;
    out.push(val);
  }

  // Negative values: -10 to -50 in multiples of 10 (base).
  for (let i = 0; i < negCount; i++) {
    const base = -10 * rng(1, 5); // -10, -20, ..., -50
    const val = doublePoints.value ? base * 2 : base;
    out.push(val);
  }

  // Shuffle
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

/* ---------------------------
 * Card actions
 * ------------------------- */
function reveal(cell: Cell) {

  if (!cell || cell.revealed) return;

  // sfx first
  if (typeof cell.value === "string") {
    if (cell.value === "Mystery Machine") {
      play("mystery");
    } else if (cell.value === "Tornado") {
      // Tornado feels like a "shuffle/swap" sound
      play("swap");
    } else {
      play("mystery");
    }
  } else {
    // Jackpot sound for the largest card:
    // 100 when Double Points is off, 200 when Double Points is on.
    const jackpotBase = 100;
    const jackpotValue = doublePoints.value ? jackpotBase * 2 : jackpotBase;

    if (cell.value === jackpotValue) {
      play("jackpot");
    } else if (cell.value > 0) {
      play("positive");
    } else {
      play("negative");
    }
  }

  // then flip
  cell.revealed = true;

  // Special cards: handle side effects & stop (no point delta)
  if (typeof cell.value === "string") {
    if (cell.value === "Tornado") {
      const tracker: any = teamTracker.value;
      if (tracker && typeof tracker.shuffleAllTeamPoints === "function") {
        tracker.shuffleAllTeamPoints();
      } else {
        console.warn(
          "[RandomPoints] Tornado card revealed, but TeamPointsTracker.shuffleAllTeamPoints() not found."
        );
      }
    }

    // Mystery Machine card currently has no extra behavior, just reveal + sound.
    return;
  }

  // Only numeric values affect team scores
  if (!hasSelectedTeam.value) return;

  const tracker: any = teamTracker.value;
  if (!tracker) return;

  // Auto-assign, applying 2x/3x next-card powers if present.
  const baseValue = cell.value;
  const finalDelta = applyCardPowersToDelta(baseValue);

  tracker.applyDeltaToSelected(finalDelta);
}



// "See All" reveals without sending any score signals
function revealAll() {
  for (const c of cells.value) c.revealed = true;
}

function reset() {
  buildCells();
}

/* ---------------------------
 * Settings helpers
 * ------------------------- */

function toggleSettingsMenu() {
  showSettings.value = !showSettings.value;
}

function saveSettings() {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      allowNegatives: allowNegatives.value,
      doublePoints: doublePoints.value,
      allowSpecial: allowSpecial.value,
      allowTornado: allowTornado.value,
      sfxMuted: sfxMuted.value,
    }),
  );
}

function applySettings() {
  saveSettings();
  buildCells();
  showSettings.value = false;
}

/* ---------------------------
 * Lifecycle
 * ------------------------- */

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
      if (typeof saved.allowTornado === "boolean") allowTornado.value = saved.allowTornado;
      if (typeof saved.sfxMuted === "boolean") sfxMuted.value = saved.sfxMuted;
    }
  } catch {
    // ignore bad localStorage
  }

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

.icon-btn .icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.icon-btn.back {
  top: 12px;
  left: 12px;
  right: auto !important;
}

.icon-btn.settings {
  top: 12px;
  right: 12px;
  left: auto !important;
}

/* Mystery Machine icon – larger and below the settings overlay */
.icon-btn.mystery {
  top: 58px;
  right: 12px;
  left: auto !important;
  width: calc(var(--icon-size) * 1.4) !important;
  height: calc(var(--icon-size) * 1.4) !important;
  z-index: 900;
  /* lower than settings overlay (z-menu = 1001) */
}

/* Hover effects for icons (desktop only) */
@media (hover:hover) and (pointer:fine) {
  .icon-btn:hover {
    transform: scale(1.1);
  }

  .icon-btn.settings:hover {
    transform: scale(1.1) rotate(10deg);
  }
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
.mute-row {
  display: flex;
  justify-content: center;
  margin-top: 10px;
}

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
  .mute-btn:hover {
    transform: translateY(-1px);
    box-shadow: var(--elevation-2);
  }
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

/* Mystery Machine overlay */
.mystery-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-menu);
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mystery-modal {
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border-radius: var(--modal-radius);
  box-shadow: var(--modal-shadow);
  border: 1px solid var(--modal-border);
  padding: 18px 16px 16px;
  width: min(360px, 90vw);
  text-align: center;
}

.mystery-text {
  margin: 6px 0 10px;
  font-size: 0.95rem;
  color: var(--modal-on-surface-muted);
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
  margin-top: 50px;
}

.label-cell {
  display: grid;
  place-items: center;
  font-weight: 800;
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
  overflow: visible;
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

.card:focus-visible {
  box-shadow: var(--focus-ring);
}

@media (hover:hover) and (pointer:fine) {
  .card:hover {
    transform: scale(1.03);
    box-shadow: var(--table-shadow);
  }
}

/* BIG + OBVIOUS Mystery Machine reveal animation */
.card.mystery-card--revealed {
  animation: mystery-pop-big 0.85s ease-out;
  position: relative;
  z-index: 999;
  /* briefly pulls it above surrounding cards */
}

@keyframes mystery-pop-big {
  0% {
    transform: scale(1);
    box-shadow: none;
    filter: brightness(1);
  }

  20% {
    transform: scale(1.25) rotate(-2deg);
    box-shadow: 0 0 25px var(--accent-primary);
    filter: brightness(1.4);
  }

  40% {
    transform: scale(1.15) rotate(2deg);
    box-shadow: 0 0 45px var(--accent-primary);
    filter: brightness(1.2);
  }

  60% {
    transform: scale(1.3) rotate(-1deg);
    box-shadow: 0 0 60px color-mix(in srgb, var(--accent-primary) 90%, white 20%);
    filter: brightness(1.6);
  }

  80% {
    transform: scale(1.18) rotate(1deg);
    box-shadow: 0 0 35px var(--accent-primary);
    filter: brightness(1.3);
  }

  100% {
    transform: scale(1.05);
    box-shadow: 0 0 20px var(--accent-primary);
    filter: brightness(1.1);
  }
}

.card.tornado-card--revealed {
  animation: tornado-spin 0.9s ease-out;
  position: relative;
  z-index: 999;
}

@keyframes tornado-spin {
  0% {
    transform: scale(1) rotate(0deg);
    box-shadow: none;
    filter: brightness(1);
  }

  25% {
    transform: scale(1.12) rotate(360deg);
    box-shadow: 0 0 25px color-mix(in srgb, var(--neutral-900) 60%, var(--accent-primary) 40%);
    filter: brightness(1.2);
  }

  55% {
    transform: scale(1.2) rotate(720deg);
    box-shadow: 0 0 40px color-mix(in srgb, var(--neutral-900) 70%, var(--neutral-0) 30%);
    filter: brightness(1.3);
  }

  80% {
    transform: scale(1.08) rotate(810deg);
    box-shadow: 0 0 24px color-mix(in srgb, var(--neutral-900) 55%, transparent);
    filter: brightness(1.15);
  }

  100% {
    transform: scale(1.02) rotate(720deg);
    box-shadow: 0 0 16px color-mix(in srgb, var(--neutral-900) 45%, transparent);
    filter: brightness(1.05);
  }
}

/* Flipper (true 2-sided flip) */
.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 380ms cubic-bezier(.2, .65, .2, 1);
  will-change: transform;
}

.flip-inner.revealed {
  transform: rotateY(180deg);
}

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
    linear-gradient(135deg,
      color-mix(in srgb, var(--accent-success) 86%, var(--neutral-0) 14%),
      color-mix(in srgb, var(--accent-success) 62%, var(--neutral-900) 38%));
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

.value.val-pos {
  color: var(--accent-success);
}

.value.val-neg {
  color: var(--accent-danger);
}

.value.val-lose {
  color: var(--accent-danger);
}

.value.val-swap {
  color: var(--accent-primary);
}

.value.val-zero {
  color: var(--modal-on-surface-muted);
}

/* New mystery color */
.value.val-mystery {
  color: var(--accent-primary);
  text-shadow: 0 0 6px color-mix(in srgb, var(--accent-primary) 55%, transparent);
}

.value.val-tornado {
  /* Dark gray text – distinct from accent colors */
  color: color-mix(in srgb, var(--neutral-900) 90%, var(--neutral-0) 10%);
  text-shadow: 0 0 4px color-mix(in srgb, var(--neutral-900) 45%, transparent);
}


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

.big-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
}

.big-btn:active {
  transform: translateY(0);
  box-shadow: var(--elevation-1);
}

/* Tiny tweak for very small screens */
@media (max-width: 420px) {
  .title {
    margin-top: 50px;
  }
}
</style>
