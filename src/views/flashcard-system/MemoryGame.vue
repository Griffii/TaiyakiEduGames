<!-- src/views/flashcard-system/MemoryGame.vue -->
<template>
  <section class="memory-game-page">
    <!-- Back Button -->
    <button class="home-button" type="button" @click="onExit" aria-label="Back">
      <img :src="homeIcon" alt="" />
    </button>

    <!-- Settings Button + Drop-down -->
    <div class="settings-wrap" ref="settingsWrap">
      <button
        class="settings-button"
        type="button"
        @click="openSettings"
        aria-haspopup="menu"
        :aria-expanded="showSettings"
        aria-controls="settings-menu"
      >
        <img :src="settingsIcon" alt="" />
      </button>

      <!-- Full-screen blurred backdrop (covers game area, not menu) -->
      <div
        v-if="showSettings"
        class="settings-backdrop"
        @click="closeSettings"
        aria-hidden="true"
      ></div>

      <!-- Drop-down with open/close animation -->
      <Transition name="settings-drop">
        <div v-if="showSettings" id="settings-menu" class="settings-dropdown" role="menu">
          <div class="settings-section" role="none">
            <div class="settings-row" role="none">
              <label class="settings-label" for="pairCount">Sets (pairs)</label>
              <select id="pairCount" v-model.number="pairCountDraft" class="settings-select">
                <option v-for="n in pairOptions" :key="n" :value="n">
                  {{ n }} sets ({{ n * 2 }} cards)
                </option>
              </select>
            </div>

            <div class="settings-row toggle-row" role="none">
              <div class="toggle-title">Auto Flip</div>
              <label class="switch" aria-label="Toggle Auto Flip">
                <input type="checkbox" v-model="autoFlip" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="settings-row toggle-row" role="none">
              <div class="toggle-title">Show Image</div>
              <label class="switch" aria-label="Toggle Show Image">
                <input type="checkbox" v-model="showImage" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="settings-row toggle-row" role="none">
              <div class="toggle-title">Show English</div>
              <label class="switch" aria-label="Toggle Show English">
                <input type="checkbox" v-model="showEnglish" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="settings-actions" role="none">
              <button class="btn ghost" type="button" @click="resetRound(true)">Reset</button>
              <button class="btn primary" type="button" @click="applyPairCount">Apply</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <header class="page-head">
      <h1 class="title">Memory Game</h1>
    </header>

    <!-- Cards area -->
    <section class="cards-section" ref="cardsSection">
      <div
        v-if="allCards.length"
        class="card-grid"
        :class="{ busy: isBusy }"
        :style="{
          gridTemplateColumns: `repeat(${layout.cols}, var(--card-w))`,
          '--card-w': `${layout.cardW}px`,
          '--card-h': `${layout.cardH}px`,
          '--grid-gap': `${layout.gap}px`,
        }"
      >
        <button
          v-for="tile in boardCards"
          :key="tile.uid"
          class="mem-card"
          type="button"
          :class="{
            matched: tile.isMatched && autoFlip,
            selectable: isSelectable(tile),
          }"
          @click="onCardClick(tile)"
          :disabled="!isSelectable(tile)"
          :aria-pressed="tile.isFaceUp ? 'true' : 'false'"
        >
          <div class="card-inner" :class="{ up: tile.isFaceUp }">
            <!-- Back -->
            <div class="face back">
              <div class="back-letter">{{ tile.backLetter }}</div>
            </div>

            <!-- Front -->
            <div class="face front">
              <div
                class="front-body"
                :class="{
                  'mode-text-only': showEnglish && !showImage,
                  'mode-image-only': showImage && !showEnglish,
                  'mode-both': showImage && showEnglish,
                }"
              >
                <!-- Image background layer (behind text) -->
                <div class="img-layer" v-if="showImage && tile.image_url">
                  <img
                    :src="tile.image_url"
                    :alt="tile.english || 'card'"
                    loading="lazy"
                    referrerpolicy="no-referrer"
                    @error="onImgError($event)"
                  />
                </div>

                <div class="no-img" v-else-if="showImage && !tile.image_url">No Image</div>

                <div class="card-text" v-if="showEnglish && tile.english">
                  {{ tile.english }}
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      <p v-else class="muted">No cards loaded. Go back and select some cards.</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useGameTransitStore, type Flashcard as TransitCard } from "@/stores/gameTransit";

type MemoryTile = TransitCard & {
  uid: string;
  baseId: string;
  isFaceUp: boolean;
  isMatched: boolean;
  backLetter: string;
};

const router = useRouter();
const transit = useGameTransitStore();

const TRANSIT_KEY = "eitake.memorygame.transit.v10";

/** Assets */
const homeIcon = new URL("@/assets/images/icons/back-icon.png", import.meta.url).toString();
const settingsIcon = new URL("@/assets/images/icons/settings-icon.png", import.meta.url).toString();

/** SFX */
const flipSfx = new Audio(new URL("@/assets/sounds/arcade_beep_01.mp3", import.meta.url).toString());
flipSfx.preload = "auto";

const matchSfx = new Audio(new URL("@/assets/sounds/fortunegame/chukichi.mp3", import.meta.url).toString());
matchSfx.preload = "auto";

const wrongSfx = new Audio(new URL("@/assets/sounds/fortunegame/shokichi.mp3", import.meta.url).toString());
wrongSfx.preload = "auto";

const props = withDefaults(
  defineProps<{
    cards?: TransitCard[];
    defaultPairs?: number;
    defaultAutoFlip?: boolean;
  }>(),
  {
    defaultPairs: 9, // requested
    defaultAutoFlip: true,
  }
);

/** Limits */
const MIN_PAIRS = 3;   // 6 cards
const MAX_PAIRS = 13;  // 26 cards

/** Settings dropdown */
const showSettings = ref(false);
const settingsWrap = ref<HTMLElement | null>(null);

/** Layout sizing container */
const cardsSection = ref<HTMLElement | null>(null);

/** Source pool */
const allCards = ref<TransitCard[]>([]);

/** Instant toggles (no reset) */
const autoFlip = ref<boolean>(!!props.defaultAutoFlip);
const showImage = ref<boolean>(true);
const showEnglish = ref<boolean>(true);

/** Pair count is the only setting that can reshuffle */
const pairCount = ref<number>(clampInt(props.defaultPairs, MIN_PAIRS, MAX_PAIRS));
const pairCountDraft = ref(pairCount.value);

/** Board state */
const boardCards = ref<MemoryTile[]>([]);
const selected = ref<MemoryTile[]>([]);
const isBusy = ref(false);

const pairOptions = computed(() => {
  const maxPairsByPool = Math.max(MIN_PAIRS, Math.min(MAX_PAIRS, Math.floor(allCards.value.length)));
  const opts: number[] = [];
  for (let i = MIN_PAIRS; i <= maxPairsByPool; i++) opts.push(i);
  return opts;
});

function openSettings() {
  showSettings.value = true;
  pairCountDraft.value = pairCount.value;
}
function closeSettings() {
  showSettings.value = false;
}

function applyPairCount() {
  const maxPairsByPool = Math.max(MIN_PAIRS, Math.min(MAX_PAIRS, Math.floor(allCards.value.length || MIN_PAIRS)));
  pairCount.value = clampInt(pairCountDraft.value, MIN_PAIRS, maxPairsByPool);
  resetRound(true);
  closeSettings();
  computeLayout();
}

function onExit() {
  try { router.back(); } catch { /* ignore */ }
}

function persistSession() {
  try {
    sessionStorage.setItem(TRANSIT_KEY, JSON.stringify({ cards: allCards.value }));
  } catch { /* ignore */ }
}

function hydrateFromSession() {
  try {
    const raw = sessionStorage.getItem(TRANSIT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.cards) && parsed.cards.length) {
      transit.set({ cards: parsed.cards });
    }
  } catch { /* ignore */ }
}

function onDocPointerDown(e: PointerEvent) {
  if (!showSettings.value) return;
  const wrap = settingsWrap.value;
  if (!wrap) return;
  if (wrap.contains(e.target as Node)) return;
  closeSettings();
}

let ro: ResizeObserver | null = null;

const layout = ref({
  cols: 4,
  rows: 3,
  cardW: 150,
  cardH: 200, // 4:3
  gap: 12,
});

onMounted(() => {
  document.addEventListener("pointerdown", onDocPointerDown);

  const source = (props.cards?.length ? props.cards : transit.cards) as TransitCard[];
  if (!source?.length) hydrateFromSession();

  const finalSource = (props.cards?.length ? props.cards : transit.cards) as TransitCard[];
  allCards.value = Array.isArray(finalSource) ? [...finalSource] : [];
  persistSession();

  const maxPairsByPool = Math.max(MIN_PAIRS, Math.min(MAX_PAIRS, Math.floor(allCards.value.length || MIN_PAIRS)));
  pairCount.value = clampInt(pairCount.value, MIN_PAIRS, maxPairsByPool);
  pairCountDraft.value = pairCount.value;

  resetRound(true);

  ro = new ResizeObserver(() => computeLayout());
  if (cardsSection.value) ro.observe(cardsSection.value);

  computeLayout();
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocPointerDown);
  if (ro) ro.disconnect();
  ro = null;
});

/**
 * Rule: only one of Show English / Show Image can be toggled OFF at a time.
 */
watch(showEnglish, (val) => {
  if (!val && !showImage.value) showImage.value = true;
});
watch(showImage, (val) => {
  if (!val && !showEnglish.value) showEnglish.value = true;
});

watch(() => allCards.value.length, () => {
  const maxPairsByPool = Math.max(MIN_PAIRS, Math.min(MAX_PAIRS, Math.floor(allCards.value.length || MIN_PAIRS)));
  pairCount.value = clampInt(pairCount.value, MIN_PAIRS, maxPairsByPool);
  pairCountDraft.value = pairCount.value;
  resetRound(true);
  computeLayout();
});

watch(() => boardCards.value.length, () => computeLayout());

function computeLayout() {
  const el = cardsSection.value;
  if (!el) return;

  const n = boardCards.value.length || pairCount.value * 2;
  if (!n) return;

  const cs = getComputedStyle(el);
  const padL = parseFloat(cs.paddingLeft || "0") || 0;
  const padR = parseFloat(cs.paddingRight || "0") || 0;
  const padT = parseFloat(cs.paddingTop || "0") || 0;
  const padB = parseFloat(cs.paddingBottom || "0") || 0;

  const availW = Math.max(0, el.clientWidth - padL - padR);
  const availH = Math.max(0, el.clientHeight - padT - padB);

  const idealCols = clampInt(Math.round(Math.sqrt(n)), 3, 8);
  const candidates = new Set<number>([idealCols - 1, idealCols, idealCols + 1, 3, 4, 5, 6, 7, 8]);

  const baseGap = clampInt(Math.round(Math.min(availW, availH) * 0.018), 10, 16);

  let best = { cols: idealCols, rows: Math.ceil(n / idealCols), cardW: 155, cardH: 206, gap: baseGap, score: -1 };

  for (const cols of candidates) {
    if (cols < 3 || cols > 8) continue;
    const rows = Math.ceil(n / cols);
    const gap = baseGap;

    const maxWByWidth = (availW - gap * (cols - 1)) / cols;
    const maxWByHeight = (availH - gap * (rows - 1)) / (rows * (4 / 3));

    let cardW = Math.floor(Math.min(maxWByWidth, maxWByHeight));
    cardW = clampInt(cardW, 76, 185);

    const cardH = Math.floor(cardW * (4 / 3));

    const totalW = cols * cardW + (cols - 1) * gap;
    const totalH = rows * cardH + (rows - 1) * gap;

    if (totalW <= availW + 0.5 && totalH <= availH + 0.5) {
      const score = cardW * cardH;
      if (score > best.score) best = { cols, rows, cardW, cardH, gap, score };
    }
  }

  layout.value = { cols: best.cols, rows: best.rows, cardW: best.cardW, cardH: best.cardH, gap: best.gap };
}

function resetRound(selectNew: boolean) {
  isBusy.value = false;
  selected.value = [];

  if (!allCards.value.length) {
    boardCards.value = [];
    return;
  }

  const maxPairsByPool = Math.max(MIN_PAIRS, Math.min(MAX_PAIRS, Math.floor(allCards.value.length)));
  const pairs = clampInt(pairCount.value, MIN_PAIRS, maxPairsByPool);

  const picked = selectNew ? pickRandomUnique(allCards.value, pairs) : pickRandomUnique(allCards.value, pairs);

  const tiles: MemoryTile[] = [];
  for (const c of picked) {
    const baseId = String((c as any).id ?? c.image_url ?? c.english ?? Math.random());
    tiles.push(makeTile(c, baseId));
    tiles.push(makeTile(c, baseId));
  }

  shuffleInPlace(tiles);
  for (let i = 0; i < tiles.length; i++) tiles[i].backLetter = letterForIndex(i);

  boardCards.value = tiles;
  for (const t of tiles.slice(0, 26)) preloadImage(t.image_url);
}

function makeTile(card: TransitCard, baseId: string): MemoryTile {
  return {
    ...(card as any),
    uid: `${baseId}::${cryptoRandom()}::${Math.random().toString(16).slice(2)}`,
    baseId,
    isFaceUp: false,
    isMatched: false,
    backLetter: "A",
  };
}

function isSelectable(tile: MemoryTile) {
  if (isBusy.value) return false;
  if (autoFlip.value && tile.isMatched) return false;
  return true;
}

function onCardClick(tile: MemoryTile) {
  if (!isSelectable(tile)) return;

  if (!autoFlip.value && tile.isFaceUp) {
    playFlip();
    tile.isFaceUp = false;
    selected.value = selected.value.filter(s => s.uid !== tile.uid);
    return;
  }

  if (tile.isFaceUp) return;

  playFlip();
  tile.isFaceUp = true;

  selected.value.push(tile);
  if (selected.value.length < 2) return;

  const [a, b] = selected.value.slice(-2);
  if (a.uid === b.uid) return;

  const isMatch = a.baseId === b.baseId;

  if (isMatch) {
    playMatch();
    if (autoFlip.value) {
      a.isMatched = true;
      b.isMatched = true;
    }
    selected.value = [];
    return;
  }

  if (autoFlip.value) {
    // play wrong SFX first, then flip back
    playWrong();
    isBusy.value = true;

    const toFlip = [a.uid, b.uid];
    selected.value = [];

    window.setTimeout(() => {
      for (const t of boardCards.value) {
        if (toFlip.includes(t.uid) && !t.isMatched) t.isFaceUp = false;
      }
      isBusy.value = false;
    }, 700);
  } else {
    selected.value = [];
  }
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement | null;
  if (!img) return;
  img.style.display = "none";
}

function playFlip() {
  try {
    flipSfx.currentTime = 0;
    void flipSfx.play();
  } catch { /* ignore */ }
}

function playMatch() {
  try {
    matchSfx.currentTime = 0;
    void matchSfx.play();
  } catch { /* ignore */ }
}

function playWrong() {
  try {
    wrongSfx.currentTime = 0;
    void wrongSfx.play();
  } catch { /* ignore */ }
}

function clampInt(n: number, min: number, max: number) {
  const v = Number.isFinite(n) ? Math.floor(n) : min;
  return Math.max(min, Math.min(max, v));
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomUnique<T>(arr: T[], count: number) {
  const copy = [...arr];
  shuffleInPlace(copy);
  return copy.slice(0, Math.min(count, copy.length));
}

function preloadImage(url?: string) {
  if (!url) return;
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = url;
}

function cryptoRandom() {
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint32Array(2);
      crypto.getRandomValues(buf);
      return `${buf[0].toString(16)}${buf[1].toString(16)}`;
    }
  } catch { /* ignore */ }
  return Math.random().toString(16).slice(2);
}

function letterForIndex(i: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const first = Math.floor(i / 26);
  const second = i % 26;
  return first === 0 ? alphabet[second] : `${alphabet[(first - 1) % 26]}${alphabet[second]}`;
}
</script>

<style scoped>
.memory-game-page {
  min-height: 100vh;
  padding: 0;
  color: var(--main-text-color);
}

/* Header */
.page-head {
  text-align: center;
  padding-top: 10px;
  pointer-events: none;
}

.title {
  margin: 6px 0 0;
  font-family: var(--main-title-font);
  font-size: var(--main-title-size);
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}

/* Icon buttons */
.home-button,
.settings-button {
  position: fixed;
  top: 10px;
  width: 62px;
  height: 62px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 80;
  transform: translateZ(0);
  transition: transform 140ms ease, filter 140ms ease;
}

.home-button { left: 10px; }

.settings-wrap {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 80;
}

.settings-button { position: static; }

.home-button img,
.settings-button img {
  width: 38px;
  height: 38px;
  filter: drop-shadow(0 2px 0 rgba(0,0,0,0.35)) drop-shadow(0 10px 18px rgba(0,0,0,0.18));
}

.home-button:hover { transform: scale(1.08) rotate(-4deg); }
.settings-button:hover { transform: scale(1.08) rotate(4deg); }

.home-button:focus-visible,
.settings-button:focus-visible {
  outline: none;
  filter: brightness(1.06);
}

/* Backdrop blur overlay */
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: color-mix(in srgb, #000 16%, transparent);
  backdrop-filter: blur(4px) saturate(115%);
  -webkit-backdrop-filter: blur(4px) saturate(115%);
}

/* Settings drop-down */
.settings-dropdown {
  position: absolute;
  top: 66px;
  right: 0;
  width: min(360px, calc(100vw - 18px));
  border-radius: var(--radius-lg);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  border: 1px solid var(--modal-border);
  box-shadow: var(--modal-shadow);
  overflow: hidden;
  z-index: 90;
}

.settings-section { padding: 12px; }

.settings-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  align-items: center;
  margin: 10px 0;
}

.settings-label {
  font-size: 12px;
  color: var(--modal-on-surface-soft);
}

.settings-select {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--select-menu-border);
  background: var(--select-menu-surface);
  color: var(--select-menu-on);
  padding: 10px 12px;
  outline: none;
}

.settings-select:focus-visible { box-shadow: var(--focus-ring); }

.toggle-row {
  grid-template-columns: 1fr auto;
  align-items: center;
}

.toggle-title {
  font-weight: 950;
  font-size: 13px;
  color: var(--modal-on-surface);
}

/* Switch */
.switch { position: relative; display: inline-block; width: 52px; height: 30px; }
.switch input { opacity: 0; width: 0; height: 0; }

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--neutral-200);
  border: 1px solid var(--select-menu-border);
  transition: 0.2s;
  border-radius: 999px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  top: 3px;
  background: var(--neutral-0);
  transition: 0.2s;
  border-radius: 999px;
}

.switch input:checked + .slider {
  background: color-mix(in srgb, var(--btn-secondary-bg) 35%, var(--neutral-0) 65%);
  border-color: var(--btn-secondary-border);
}

.switch input:checked + .slider:before { transform: translateX(22px); }

.settings-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
}

.btn {
  border-radius: var(--radius-md);
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 900;
  border: 1px solid transparent;
}

.btn.primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  border-color: var(--btn-primary-border);
}

.btn.ghost {
  background: var(--btn-ghost-bg);
  color: var(--btn-ghost-on);
  border-color: var(--btn-ghost-border);
}

/* Cards section */
.cards-section {
  height: calc(100vh - 102px);
  padding: clamp(12px, 2.2vw, 20px);
  padding-top: clamp(10px, 2vw, 16px);
  padding-bottom: clamp(10px, 2vw, 16px);

  box-sizing: border-box;
  width: 100%;
  max-width: 100vw;

  display: grid;
  place-items: center;
  overflow: visible;
}

.card-grid {
  display: grid;
  gap: var(--grid-gap);
  overflow: visible;
  align-content: center;
  justify-content: center;
  max-width: 100%;
}

.card-grid.busy {
  pointer-events: none;
  opacity: 0.98;
}

.mem-card {
  width: var(--card-w);
  height: var(--card-h);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  overflow: visible;
  transition: transform 140ms ease, filter 140ms ease;
}

.mem-card:hover {
  transform: scale(1.03);
  filter: brightness(1.03);
}

/* Flipper */
.card-inner {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
  transform-style: preserve-3d;
  transition: transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
  position: relative;
}

.card-inner.up {
  transform: rotateY(180deg);
}

/* Faces */
.face {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  overflow: visible;
  border: 1px solid var(--flashcards-border);
  box-shadow: var(--flashcards-shadow);
}

/* Back */
.face.back {
  display: grid;
  place-items: center;
  background: var(--btn-ghost-bg);
  overflow: hidden;
}

.back-letter {
  font-family: var(--main-title-font);
  font-weight: 950;
  font-size: clamp(20px, 3.8vh, 36px);
  color: color-mix(in srgb, var(--table-on-surface) 75%, #000 25%);
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.22);
}

/* Front (hard-coded white background) */
.face.front {
  transform: rotateY(180deg);
  background: #ffffff; /* requested */
  color: var(--flashcards-on-surface);
}

.front-body {
  position: relative;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  overflow: hidden; /* keep within card */
}

/* Image background layer */
.img-layer {
  position: absolute;
  inset: 8px;
  display: grid;
  place-items: center;
  z-index: 0;
  overflow: hidden;
}

.img-layer img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.no-img {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--modal-on-surface-soft);
  opacity: 0.85;
  font-size: 12px;
  z-index: 0;
}

/* English overlay */
.card-text {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 10px;
  z-index: 1;

  background: rgba(255, 255, 255, 0.92);
  border: 1px solid color-mix(in srgb, var(--flashcards-border) 28%, transparent 72%);
  border-radius: var(--radius-md);
  padding: clamp(6px, 1.0vh, 10px) clamp(8px, 1.2vh, 12px);

  font-weight: 950;
  color: #000;
  text-align: center;
  line-height: 1.1;

  font-size: clamp(12px, 1.5vh, 20px);
  max-height: 48%;
  overflow: hidden;
}

.front-body.mode-text-only {
  position: relative;
}
/* Text-only: center horizontally & vertically */
/* Center the .card-text block within that container */
.front-body.mode-text-only .card-text {
  position: absolute;
  top: 50%;
  left: 50%;
  right: auto;
  bottom: auto;
  transform: translate(-50%, -50%);
  font-size: clamp(12px, 2.2vh, 26px);
  padding: clamp(10px, 2.0vh, 16px);
  border: transparent;
}

/* Image-only */
.front-body.mode-image-only .card-text { display: none; }

/* Matched */
.mem-card.matched .face {
  border-color: color-mix(in srgb, var(--accent-success) 55%, var(--flashcards-border) 45%);
}

/* Settings menu animations */
.settings-drop-enter-active { animation: dropIn 180ms ease-out both; }
.settings-drop-leave-active { animation: slideUpOut 160ms ease-in both; }

@keyframes dropIn {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes slideUpOut {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to   { opacity: 0; transform: translateY(-10px) scale(0.98); }
}

/* Responsive */
@media (max-width: 520px) {
  .settings-row { grid-template-columns: 1fr; }
  .settings-dropdown { width: min(360px, calc(100vw - 12px)); }
  .front-body { padding: 8px; }
  .img-layer { inset: 6px; }
  .card-text { left: 8px; right: 8px; bottom: 8px; }
  .front-body.mode-text-only .card-text { top: 8px; bottom: 8px; }
}

.muted {
  text-align: center;
  color: var(--main-text-soft);
}
</style>
