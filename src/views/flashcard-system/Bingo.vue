<!-- src/views/flashcard-system/Bingo.vue -->
<template>
  <section class="bingo-page chalkboard-bg" @click.self="closeSettings">
    <!-- Top Bar (back far left, settings far right) -->
    <header class="topbar">
      <button class="icon-btn back" type="button" @click="onBack" aria-label="Back" title="Back">
        <img class="icon" src="@/assets/images/icons/back-icon.png" alt="" />
      </button>

      <button
        class="icon-btn settings"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="showSettings ? 'true' : 'false'"
        aria-controls="settings-menu"
        title="Settings"
        @click.stop="toggleSettings"
      >
        <img class="icon" src="@/assets/images/icons/settings-icon.png" alt="" />
      </button>

      <!-- Backdrop to close the menu when clicking outside -->
      <div v-show="showSettings" class="settings-backdrop" @click="closeSettings" />
      <!-- Settings Menu -->
      <div
        v-show="showSettings"
        id="settings-menu"
        class="settings-menu"
        role="dialog"
        :aria-modal="true"
        @click.stop
      >
        <h2 class="settings-title">Settings</h2>

        <div class="setting">
          <label class="setting-label">Grid size</label>
          <div class="size-options">
            <label :class="{ disabled: !canUseSize(3) }">
              <input type="radio" name="grid-size" :value="3" v-model.number="size" :disabled="!canUseSize(3)" @change="onSizeChange" />
              3×3
            </label>
            <label :class="{ disabled: !canUseSize(4) }">
              <input type="radio" name="grid-size" :value="4" v-model.number="size" :disabled="!canUseSize(4)" @change="onSizeChange" />
              4×4
            </label>
            <label :class="{ disabled: !canUseSize(5) }">
              <input type="radio" name="grid-size" :value="5" v-model.number="size" :disabled="!canUseSize(5)" @change="onSizeChange" />
              5×5
            </label>
          </div>
          <p class="hint">Need {{ neededCount }} cards. Deck has {{ totalCount }}.</p>
        </div>

        <div class="setting actions">
          <button
            class="btn toggle-english"
            :class="showEnglish ? 'on' : 'off'"
            type="button"
            @click="toggleEnglish()"
          >
            English: {{ showEnglish ? 'On' : 'Off' }}
          </button>

          <button class="btn" type="button" @click="resetMarks">Reset</button>
          <button class="btn" type="button" @click="reshuffle">New Words</button>

          <!-- Make Prints trigger -->
          <button class="btn make-prints" type="button" @click="showPrintDialog = true">
            Make Prints
          </button>
        </div>
      </div>
    </header>

    <!-- Grid -->
    <main class="grid-shell" v-if="loaded && tiles.length">
      <div
        class="bingo-grid"
        :style="{ gridTemplateColumns: `repeat(${size}, 1fr)`, gridTemplateRows: `repeat(${size}, 1fr)` }"
      >
        <!-- Tiles -->
        <button
          v-for="tile in tiles"
          :key="tile.uid"
          type="button"
          class="card"
          :class="{ free: tile.free }"
          :aria-pressed="tile.marked ? 'true' : 'false'"
          :disabled="tile.free"
          @click="onTileClick(tile.uid)"
        >
          <div class="card-face" v-if="!tile.free">
            <img
              v-if="tile.card.image"
              class="img"
              :src="tile.card.image"
              :alt="tile.card.en || 'card image'"
              crossorigin="anonymous"
              draggable="false"
              loading="eager"
              decoding="async"
              referrerpolicy="no-referrer"
              @load="fitAllTextSoon()"
            />
            <div class="label" v-if="showEnglish && tile.card.en">
              <span class="en">{{ tile.card.en }}</span>
            </div>
          </div>

          <!-- Free Space (5x5 center) -->
          <div v-else class="free-full">
            <span class="free-text">Free Space</span>
          </div>

          <!-- Red circle overlay: strong if tile is on a winning line, soft otherwise -->
          <div
            class="mark"
            v-show="tile.marked"
            :class="winningUIDs.has(tile.uid) ? 'strong' : 'soft'"
            aria-hidden="true"
          ></div>
        </button>
      </div>
    </main>

    <main v-else class="grid-shell">
      <p class="hint">Preparing Bingo…</p>
    </main>

    <!-- SFX -->
    <audio ref="selectEl" :src="selectSfxUrl" preload="auto"></audio>
    <audio ref="deselectEl" :src="deselectSfxUrl" preload="auto"></audio>
    <audio ref="bingoEl" :src="bingoSfxUrl" preload="auto"></audio>
    <audio ref="celebrateEl" :src="celebrateSfxUrl" preload="auto"></audio>

    <!-- Super Bingo popup -->
    <transition name="super-pop">
      <div v-if="showSuper" class="super-bingo" role="status" aria-live="polite">
        Super Bingo!
        <span class="shine" aria-hidden="true"></span>
      </div>
    </transition>

    <!-- Print overlay + dialog -->
    <div v-if="showPrintDialog" class="print-overlay" @click="showPrintDialog = false"></div>
    <dialog v-if="showPrintDialog" class="print-dialog" open @close="showPrintDialog=false">
      <form @submit.prevent="startMakePrints">
        <h3 class="print-title">Make Prints</h3>

        <p class="print-warning">
          ⚠️ Long words may space oddly. PDFs usually space text better than the live view, 
          and images will stretch/shrink to fill B5. 
          If the layout looks off, resize your browser window before generating.
        </p>

        <label class="print-label">
          How many cards?
          <input v-model.number="printCount" class="print-input" type="number" min="1" max="200" required />
        </label>

        <label class="print-check">
          <input type="checkbox" v-model="combineIntoSingle" />
          Combine into a single PDF (one page per card)
        </label>

        <p class="print-hint">
          Output:
          <template v-if="combineIntoSingle">
            1 × B5 PDF with {{ printCount }} pages.
          </template>
          <template v-else>
            .zip with {{ printCount }} × B5 PDFs.
          </template>
        </p>

        <div class="print-actions">
          <button class="btn" type="button" @click="showPrintDialog = false" :disabled="busy">Cancel</button>
          <button class="btn primary" type="submit" :disabled="busy">Generate</button>
        </div>

        <p v-if="busy" class="progress">Generating… {{progress}} / {{printCount}}</p>
      </form>
    </dialog>

    <!-- Off-screen print root -->
    <div ref="printRoot" class="print-root" aria-hidden="true"></div>

    <!-- Busy overlay to hide flicker while we temporarily swap boards -->
    <div v-if="busy" class="busy-overlay" aria-hidden="true">
      <div class="busy-card">
        <div class="spinner" aria-hidden="true"></div>
        <div>Generating PDFs… {{ progress }} / {{ printCount }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, withDefaults, nextTick, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useGameTransitStore } from '@/stores/gameTransit';
import selectSfxUrl from '@/assets/sounds/Wood_Block.ogg';
import deselectSfxUrl from '@/assets/sounds/arcade_beep_01.mp3';
import bingoSfxUrl from '@/assets/sounds/pizzicato up 1.wav';
import celebrateSfxUrl from '@/assets/sounds/anime-wow-sound-effect.mp3';

/* --- PRINT LIBS --- */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/* B5 portrait in mm */
const B5_MM = { w: 176, h: 250 };

type Flashcard = {
  id?: string | number;
  en?: string;
  image?: string;
};

const props = withDefaults(defineProps<{ cards?: Flashcard[] }>(), { cards: () => [] });

const router = useRouter();
const gameTransit = useGameTransitStore() as any;

const showSettings = ref(false);
/** Default grid size is 3x3 */
const size = ref(3);
const loaded = ref(false);
const showEnglish = ref(true);

/** PRINT state */
const showPrintDialog = ref(false);
const printCount = ref(10);
const combineIntoSingle = ref(true); // default to single multi-page PDF
const busy = ref(false);
const progress = ref(0);
const printRoot = ref<HTMLDivElement | null>(null);

/** SFX refs + gates */
const selectEl = ref<HTMLAudioElement | null>(null);
const deselectEl = ref<HTMLAudioElement | null>(null);
const bingoEl = ref<HTMLAudioElement | null>(null);
const celebrateEl = ref<HTMLAudioElement | null>(null);
const hasCelebrated = ref(false);

/** Super Bingo popup */
const showSuper = ref(false);
let superTimer: number | null = null;

/** Tiles */
type Tile = { uid: string; card: Flashcard; marked: boolean; row: number; col: number; free?: boolean };
const tiles = reactive<Tile[]>([]);

/** Source cards: prop → gameTransit → sessionStorage */
const sourceCards = ref<Flashcard[]>([]);

const neededCount = computed(() => size.value * size.value);
const totalCount = computed(() => sourceCards.value.length);

/** Winning state */
const winning = reactive({
  rows: new Set<number>(),
  cols: new Set<number>(),
  diagTLBR: false,
  diagTRBL: false,
});
/** Track which lines already celebrated */
const celebratedRows = new Set<number>();
const celebratedCols = new Set<number>();
let celebratedTLBR = false;
let celebratedTRBL = false;

/** Map of tile.uids that belong to any currently completed line */
const winningUIDs = computed(() => {
  const set = new Set<string>();
  for (const t of tiles) {
    if (
      winning.rows.has(t.row) ||
      winning.cols.has(t.col) ||
      (winning.diagTLBR && t.row === t.col) ||
      (winning.diagTRBL && t.col === size.value - 1 - t.row)
    ) {
      set.add(t.uid);
    }
  }
  return set;
});

function onBack() { router.back(); }
function toggleSettings() { showSettings.value = !showSettings.value; }
function closeSettings() { showSettings.value = false; }

function canUseSize(s: number) { return totalCount.value >= s * s; }

function play(el: HTMLAudioElement | null) {
  if (!el || !el.src) return;
  try { el.currentTime = 0; /* @ts-ignore */ el.play()?.catch?.(() => {}); } catch {}
}

function resetMarks() {
  tiles.forEach(t => { if (!t.free) t.marked = false; });
  hasCelebrated.value = false;
  clearWins();
  hideSuperSoon(0);
  fitAllTextSoon();
}

function onTileClick(uid: string) {
  const t = tiles.find(x => x.uid === uid);
  if (!t || t.free) return;

  const wasMarked = t.marked;
  t.marked = !t.marked;

  if (!wasMarked && t.marked) play(selectEl.value);
  if (wasMarked && !t.marked) {
    play(deselectEl.value);
    hasCelebrated.value = false;
    hideSuperSoon(0);
  }

  evaluateWins();
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sampleUnique<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  if (n >= arr.length) return shuffle(arr).slice(0, n);
  return shuffle(arr).slice(0, n);
}

/** Normalize payloads into {en, image} */
function normalizeToFlashcards(raw: any[]): Flashcard[] {
  return (raw || []).map((c: any) => ({
    id: c.id ?? c.card_id,
    en: c.en ?? c.english ?? '',
    image: c.image ?? c.image_url ?? '',
  }));
}

function rebuildTiles() {
  tiles.splice(0, tiles.length);
  clearWins();
  hasCelebrated.value = false;
  hideSuperSoon(0);

  const needed = neededCount.value;
  const pick = sampleUnique(sourceCards.value, needed);

  for (let i = 0; i < needed; i++) {
    const r = Math.floor(i / size.value);
    const c = i % size.value;
    const isFree = size.value === 5 && r === 2 && c === 2;

    tiles.push({
      uid: `${Date.now()}-${i}`,
      card: isFree ? { en: 'Free Space', image: '' } : pick[i],
      marked: isFree ? true : false,
      row: r,
      col: c,
      free: isFree,
    });
  }

  evaluateWins(); // includes free space contributions
  fitAllTextSoon();
}

function reshuffle() {
  if (!canUseSize(size.value)) {
    if (size.value >= 5 && canUseSize(4)) size.value = 4;
    if (size.value >= 4 && !canUseSize(4)) size.value = 3;
  }
  rebuildTiles();
}
function onSizeChange() { reshuffle(); }

function toggleEnglish() {
  showEnglish.value = !showEnglish.value;
  fitAllTextSoon();
}

function gridAllMarked(): boolean {
  return tiles.length > 0 && tiles.every(t => t.marked);
}

function clearWins() {
  winning.rows.clear();
  winning.cols.clear();
  winning.diagTLBR = false;
  winning.diagTRBL = false;

  celebratedRows.clear();
  celebratedCols.clear();
  celebratedTLBR = false;
  celebratedTRBL = false;
}

function evaluateWins() {
  const n = size.value;
  const marked = Array.from({ length: n }, () => Array<boolean>(n).fill(false));
  for (const t of tiles) marked[t.row][t.col] = t.marked;

  // rows/cols
  for (let r = 0; r < n; r++) setWin('row', r, marked[r].every(Boolean));
  for (let c = 0; c < n; c++) {
    let ok = true;
    for (let r = 0; r < n; r++) if (!marked[r][c]) { ok = false; break; }
    setWin('col', c, ok);
  }

  // diagonals
  let tlbr = true, trbl = true;
  for (let i = 0; i < n; i++) {
    if (!marked[i][i]) tlbr = false;
    if (!marked[i][n - 1 - i]) trbl = false;
  }
  setDiag('tlbr', tlbr);
  setDiag('trbl', trbl);

  // blackout
  if (gridAllMarked() && !hasCelebrated.value) {
    hasCelebrated.value = true;
    play(celebrateEl.value);
    showSuperNow();
  }
}

function setWin(kind: 'row' | 'col', idx: number, isWin: boolean) {
  if (kind === 'row') {
    if (isWin) {
      winning.rows.add(idx);
      if (!celebratedRows.has(idx)) { celebratedRows.add(idx); play(bingoEl.value); }
    } else {
      winning.rows.delete(idx);
      celebratedRows.delete(idx);
    }
  } else {
    if (isWin) {
      winning.cols.add(idx);
      if (!celebratedCols.has(idx)) { celebratedCols.add(idx); play(bingoEl.value); }
    } else {
      winning.cols.delete(idx);
      celebratedCols.delete(idx);
    }
  }
}

function setDiag(which: 'tlbr' | 'trbl', isWin: boolean) {
  if (which === 'tlbr') {
    if (isWin) {
      if (!winning.diagTLBR) {
        winning.diagTLBR = true;
        if (!celebratedTLBR) { celebratedTLBR = true; play(bingoEl.value); }
      }
    } else {
      winning.diagTLBR = false; celebratedTLBR = false;
    }
  } else {
    if (isWin) {
      if (!winning.diagTRBL) {
        winning.diagTRBL = true;
        if (!celebratedTRBL) { celebratedTRBL = true; play(bingoEl.value); }
      }
    } else {
      winning.diagTRBL = false; celebratedTRBL = false;
    }
  }
}

function showSuperNow() {
  showSuper.value = true;
  if (superTimer) window.clearTimeout(superTimer);
  superTimer = window.setTimeout(() => (showSuper.value = false), 1600);
}
function hideSuperSoon(ms = 200) {
  if (superTimer) window.clearTimeout(superTimer);
  superTimer = window.setTimeout(() => (showSuper.value = false), ms);
}

/* ---------- FitText (programmatic; live-only) ---------- */
/* These bounds affect ONLY the on-screen fit algorithm. */
const FIT_MIN_PX = 9;
const FIT_MAX_PX = 22;
const BASE_LINE_HEIGHT = 1.15;
let fitRaf: number | null = null;

function fits(parent: HTMLElement, el: HTMLElement) {
  return el.scrollWidth <= parent.clientWidth && el.scrollHeight <= parent.clientHeight;
}

function fitOne(el: HTMLElement) {
  const parent = el.parentElement as HTMLElement | null;
  if (!parent) return;

  // Center vertically via the container; keep the child inline-block so centering is stable
  parent.style.overflow = 'hidden';
  el.style.display = 'inline-block';
  el.style.whiteSpace = 'pre-wrap';
  el.style.lineHeight = String(BASE_LINE_HEIGHT);
  el.style.fontSize = ''; // reset to CSS base

  // Start from the smaller of current size and FIT_MAX_PX
  const cs = window.getComputedStyle(el);
  let sizePx = Math.min(FIT_MAX_PX, Math.max(FIT_MIN_PX, parseFloat(cs.fontSize || '16')));

  el.style.fontSize = `${sizePx}px`;

  // First pass: shrink font until both width & height fit
  while (!fits(parent, el) && sizePx > FIT_MIN_PX) {
    sizePx -= 1;
    el.style.fontSize = `${sizePx}px`;
  }

  // If still overflowing, try a mild line-height squeeze (down to 1.05 then 1.0)
  if (!fits(parent, el)) {
    let lh = BASE_LINE_HEIGHT;
    const targets = [1.08, 1.05, 1.02, 1.0];
    for (const t of targets) {
      if (lh <= t) continue;
      lh = t;
      if (fits(parent, el)) break;
      el.style.lineHeight = String(lh);
    }
  }

  // Final safety: if it *still* doesn’t fit, go down to absolute min size
  if (!fits(parent, el) && sizePx !== FIT_MIN_PX) {
    sizePx = FIT_MIN_PX;
    el.style.fontSize = `${sizePx}px`;
  }
}

function fitAllTextNow() {
  if (fitRaf) cancelAnimationFrame(fitRaf);
  fitRaf = requestAnimationFrame(() => {
    const nodes = document.querySelectorAll<HTMLElement>('.bingo-grid .label .en');
    nodes.forEach(fitOne);
  });
}
function fitAllTextSoon() { nextTick().then(() => fitAllTextNow()); }

defineExpose({ fitAllTextSoon });

/* ---------- SCROLL LOCK HELPERS ---------- */
let prevBodyOverflow: string | null = null;
let prevHtmlOverflow: string | null = null;

function lockScroll(on: boolean) {
  if (on) {
    if (prevBodyOverflow === null) prevBodyOverflow = document.body.style.overflow || '';
    if (prevHtmlOverflow === null) prevHtmlOverflow = document.documentElement.style.overflow || '';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  } else {
    if (prevBodyOverflow !== null) document.body.style.overflow = prevBodyOverflow;
    if (prevHtmlOverflow !== null) document.documentElement.style.overflow = prevHtmlOverflow;
    prevBodyOverflow = null;
    prevHtmlOverflow = null;
  }
}

/* ---------- PRINT: use the LIVE GRID so PDFs match exactly ---------- */

function waitForImages(el: Element): Promise<void> {
  const imgs = Array.from(el.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let loaded = 0;
    const done = () => { loaded++; if (loaded === imgs.length) resolve(); };
    imgs.forEach((img) => {
      const i = img as HTMLImageElement;
      if (i.complete) return done();
      i.addEventListener('load', done, { once: true });
      i.addEventListener('error', done, { once: true });
    });
  });
}

/** Force html2canvas-safe colors on the cloned grid so token color() / color-mix() never break parsing */
function applyCanvasSafeTheme(rootEl: HTMLElement) {
  // Board
  const grid = rootEl.querySelector('.bingo-grid') as HTMLElement | null;
  if (grid) {
    grid.style.background = '#f7fafc';              // light, neutral
    grid.style.border = '1px solid #222222';
    grid.style.boxShadow = 'none';
    grid.style.borderRadius = '12px';
  }

  // Cards
  rootEl.querySelectorAll<HTMLElement>('.card').forEach((el) => {
    el.style.background = '#ffffff';
    el.style.border = '2px solid #222222';
    el.style.boxShadow = 'none';
    el.style.borderRadius = '10px';
  });

  // Images
  rootEl.querySelectorAll<HTMLElement>('.img').forEach((el) => {
    el.style.background = '#ffffff';
    el.style.borderRadius = '6px';
  });

  // Labels
  rootEl.querySelectorAll<HTMLElement>('.label').forEach((el) => {
    el.style.background = 'rgba(255,255,255,0.78)';
    el.style.border = '1px solid #222222';
    el.style.boxShadow = 'none';
    el.style.borderRadius = '6px';
  });

  // Text
  rootEl.querySelectorAll<HTMLElement>('.en, .free-text').forEach((el) => {
    el.style.color = '#111111';
  });

  // Mark rings
  rootEl.querySelectorAll<HTMLElement>('.mark').forEach((el) => {
    el.style.borderColor = '#ff0000';
    el.style.opacity = el.classList.contains('soft') ? '0.45' : '1';
  });
}

async function renderLiveGridToCanvas(): Promise<HTMLCanvasElement> {
  const live = document.querySelector('.bingo-grid') as HTMLElement | null;
  if (!live) throw new Error('Live bingo grid not found');

  const rect = live.getBoundingClientRect();
  const clone = live.cloneNode(true) as HTMLElement;

  Object.assign(clone.style, {
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    transform: 'none',
    transition: 'none',
  });

  // Ensure label background is readable (will be overridden by safe theme too)
  clone.querySelectorAll<HTMLElement>('.label').forEach(el => {
    el.style.background = 'rgba(255,255,255,0.65)';
  });

  // 🔒 Force html2canvas-safe flat colors to avoid CSS Color 4 parsing
  applyCanvasSafeTheme(clone);

  const root = printRoot.value!;
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'absolute',
    left: '-99999px',
    top: '-99999px',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  wrapper.appendChild(clone);
  root.appendChild(wrapper);

  await nextTick();
  await waitForImages(clone);

  const MAX_CANVAS_PX = 2200;
  const scaleBase = 2;
  const targetW = Math.min(rect.width * scaleBase, MAX_CANVAS_PX);
  const targetH = Math.min(rect.height * scaleBase, MAX_CANVAS_PX);

  const canvas = await html2canvas(clone, {
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    windowWidth: Math.round(rect.width),
    windowHeight: Math.round(rect.height),
    scale: Math.min(targetW / rect.width, targetH / rect.height),
  });

  root.removeChild(wrapper);
  return canvas;
}

function snapshotBoard() {
  return {
    size: size.value,
    showEnglish: showEnglish.value,
    tiles: tiles.map(t => ({ ...t, card: { ...t.card } })) as Tile[],
  };
}

async function restoreBoard(snap: { size: number; showEnglish: boolean; tiles: Tile[] }) {
  size.value = snap.size;
  showEnglish.value = snap.showEnglish;
  tiles.splice(0, tiles.length, ...snap.tiles);
  await nextTick();
  fitAllTextSoon();
}

async function swapInRandomBoard() {
  tiles.splice(0, tiles.length);
  const needed = neededCount.value;
  const pick = sampleUnique(sourceCards.value, needed);

  for (let i = 0; i < needed; i++) {
    const r = Math.floor(i / size.value);
    const c = i % size.value;
    const isFree = size.value === 5 && r === 2 && c === 2;

    tiles.push({
      uid: `${Date.now()}-${i}`,
      card: isFree ? { en: 'Free Space', image: '' } : pick[i],
      marked: isFree ? true : false,
      row: r,
      col: c,
      free: isFree,
    });
  }
  clearWins();
  evaluateWins();
  await nextTick();
  const grid = document.querySelector('.bingo-grid');
  if (grid) await waitForImages(grid);
  fitAllTextSoon();
}

function fitCanvasOnB5(canvas: HTMLCanvasElement) {
  const pageW = B5_MM.w;
  const pageH = B5_MM.h;
  const imgW = canvas.width;
  const imgH = canvas.height;
  const imgRatio = imgW / imgH;
  const pageRatio = pageW / pageH;

  let wMm = pageW;
  let hMm = pageH;
  if (imgRatio > pageRatio) {
    hMm = pageW / imgRatio;
  } else {
    wMm = pageH * imgRatio;
  }
  const xMm = (pageW - wMm) / 2;
  const yMm = (pageH - hMm) / 2;
  return { xMm, yMm, wMm, hMm };
}

async function startMakePrints() {
  if (!canUseSize(size.value)) {
    alert(`Not enough cards in this deck to make a ${size.value}×${size.value} board.`);
    return;
  }

  const snap = snapshotBoard();

  try {
    busy.value = true;
    progress.value = 0;

    if (combineIntoSingle.value) {
      const pdf = new jsPDF({
        unit: 'mm',
        format: [B5_MM.w, B5_MM.h],
        orientation: 'portrait',
        compress: true,
      });

      for (let i = 0; i < printCount.value; i++) {
        if (i !== 0) {
          await swapInRandomBoard();
          pdf.addPage([B5_MM.w, B5_MM.h], 'portrait');
        }

        const canvas = await renderLiveGridToCanvas();
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const { xMm, yMm, wMm, hMm } = fitCanvasOnB5(canvas);
        pdf.addImage(jpegDataUrl, 'JPEG', xMm, yMm, wMm, hMm, undefined, 'FAST');

        progress.value = i + 1;
        await new Promise((r) => setTimeout(r, 0));
      }

      const blob = pdf.output('blob');
      saveAs(blob, `bingo_b5_x${printCount.value}.pdf`);
    } else {
      const zip = new JSZip();

      for (let i = 0; i < printCount.value; i++) {
        if (i !== 0) {
          await swapInRandomBoard();
        }

        const canvas = await renderLiveGridToCanvas();
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const pdf = new jsPDF({
          unit: 'mm',
          format: [B5_MM.w, B5_MM.h],
          orientation: 'portrait',
          compress: true,
        });
        const { xMm, yMm, wMm, hMm } = fitCanvasOnB5(canvas);
        pdf.addImage(jpegDataUrl, 'JPEG', xMm, yMm, wMm, hMm, undefined, 'FAST');

        const blob = pdf.output('blob');
        zip.file(`bingo_b5_${String(i + 1).padStart(2, '0')}.pdf`, blob);

        progress.value = i + 1;
        await new Promise((r) => setTimeout(r, 0));
      }

      const zipped = await zip.generateAsync({ type: 'blob' });
      saveAs(zipped, `bingo_b5_x${printCount.value}.zip`);
    }
  } catch (err) {
    console.error(err);
    alert('Failed to generate prints. Check console for details.');
  } finally {
    await restoreBoard(snap);
    busy.value = false;
    showPrintDialog.value = false;
    lockScroll(false);
  }
}

/* ---------- Lifecycle ---------- */
onMounted(() => {
  if (props.cards && props.cards.length) {
    sourceCards.value = normalizeToFlashcards(props.cards);
  } else if ((gameTransit as any)?.cards?.length) {
    sourceCards.value = normalizeToFlashcards((gameTransit as any).cards);
  } else {
    try {
      const raw = sessionStorage.getItem('eitake.bingo.transit.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        sourceCards.value = normalizeToFlashcards(parsed?.cards || []);
      }
    } catch {/* ignore */}
  }

  size.value = 3; // default 3x3
  if (sourceCards.value.length) {
    rebuildTiles();
    loaded.value = true;
  } else {
    loaded.value = true;
  }

  window.addEventListener('resize', fitAllTextSoon, { passive: true });
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', fitAllTextSoon);
  if (fitRaf) cancelAnimationFrame(fitRaf);
  lockScroll(false);
});

watch(() => props.cards, (nv) => {
  if (nv && nv.length) {
    sourceCards.value = normalizeToFlashcards(nv);
    rebuildTiles();
  }
}, { deep: true });
</script>

<style scoped>
/* ================= TOKEN-ONLY UI + PRINT-SAFE BOARD ================= */
/* UI chrome (menus/overlays/buttons) uses global tokens from chalkboard.css */
/* Bingo board colors are tokenized for live view, but the PDF clone is
   force-overridden to flat hex/rgba in applyCanvasSafeTheme(). */

/* Page */
.bingo-page {
  min-height: 100svh;
  display: grid;
  grid-template-rows: auto 1fr;
  color: var(--text-main-dark);
}

/* Top bar */
.topbar { position: relative; height: 0; }
.icon-btn { border: none; background: transparent; padding: 0; cursor: pointer; line-height: 0; }
.icon-btn .icon { width: clamp(26px, 3.8vw, 36px); height: clamp(26px, 3.8vw, 36px); }
.icon-btn:hover { transform: scale(1.06); }
.icon-btn:active { transform: scale(0.96); }
.icon-btn.back { position: fixed; top: 10px; left: 10px; z-index: 60; }
.icon-btn.settings { position: fixed; top: 10px; right: 10px; z-index: 60; }
.icon-btn.settings:hover { transform: scale(1.06) rotate(6deg); }

/* Overlays — frosted glass */
.settings-backdrop,
.print-overlay,
.busy-overlay {
  position: fixed; inset: 0;
  background: rgba(15, 15, 20, 0.35);
  -webkit-backdrop-filter: blur(8px) saturate(1.1);
  backdrop-filter: blur(8px) saturate(1.1);
}
.settings-backdrop { z-index: 59; }
.print-overlay { z-index: 110; }
.busy-overlay { z-index: 200; display: grid; place-items: center; }

/* Settings menu — tokenized */
.settings-menu {
  position: fixed;
  right: 10px;
  top: calc(10px + clamp(26px, 3.8vw, 36px) + 8px);
  width: min(92vw, 420px);
  padding: 12px;
  border: 1px solid var(--modal-border, var(--border-main));
  background: var(--modal-surface, var(--surface-main));
  color: var(--modal-on-surface, var(--text-main-dark));
  box-shadow: var(--modal-shadow, var(--shadow-main));
  border-radius: var(--modal-radius, var(--radius-lg));
  z-index: 60;
}
.settings-title { margin: 0 0 8px 0; font-size: 16px; font-weight: 800; }
.setting { margin-top: 10px; }
.setting-label { display: block; font-weight: 700; color: var(--modal-on-surface-muted, var(--text-main-muted)); margin-bottom: 6px; }
.size-options { display: flex; gap: 12px; flex-wrap: wrap; }
.size-options label {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--modal-border, var(--border-main));
  border-radius: var(--radius-md);
  background: var(--modal-surface-weak, var(--surface-main-weak));
  color: var(--modal-on-surface, var(--text-main-dark));
  cursor: pointer;
}
.size-options label.disabled { opacity: 0.55; cursor: not-allowed; }
.hint { margin-top: 6px; font-size: 12px; color: var(--modal-on-surface-soft, var(--text-main-soft)); }

/* Buttons — tokenized */
.setting.actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.btn {
  border: 2px solid var(--btn-ghost-border, var(--border-colorful-main));
  background: var(--btn-ghost-bg, var(--surface-main));
  color: var(--btn-ghost-on, var(--text-main-dark));
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-weight: 800;
  cursor: pointer;
  transition: transform .12s ease, background-color .15s ease;
}
.btn:hover { transform: scale(1.06); background: var(--btn-ghost-bg-hover, var(--surface-main-weak)); }
.btn.primary { background: var(--btn-primary-bg, var(--accent-main)); border-color: var(--btn-primary-border, var(--border-colorful-main)); color: var(--btn-primary-on, #0b0b0b); }
.btn.make-prints { background: var(--btn-secondary-bg, #6d28d9); color: var(--btn-secondary-on, #fff); border-color: var(--btn-secondary-border, #7c3aed); }
.btn.make-prints:hover { transform: scale(1.06); }

/* Grid shell & board — tokenized for live view */
.grid-shell { display: grid; place-items: center; padding: clamp(8px, 1.6vw, 14px); }
.bingo-grid {
  position: relative;
  width: min(92vw, 1000px);
  height: min(calc(100svh - 120px), 1000px);
  aspect-ratio: 1 / 1;
  display: grid;
  gap: clamp(6px, 1vw, 12px);
  padding: clamp(6px, 1vw, 12px);
  background: var(--surface-flashcards-weak);
  border: 1px solid var(--border-main);
  box-shadow: var(--shadow-flashcards);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* Card tiles — HARD-CODED background & border so live view always shows them (print is overridden in JS) */
.card {
  position: relative;
  border: 2px solid #1f2937;      /* dark gray border for visibility */
  border-radius: var(--radius-md);
  background: #ffffff;            /* solid white card bg */
  color: var(--text-flashcards);
  box-shadow: var(--shadow-flashcards);
  cursor: pointer;
  display: grid;
  place-items: stretch;
  padding: clamp(4px, 0.8vw, 10px);
  transition: transform .12s ease;
  overflow: hidden;
}
.card.free { cursor: default; }
.card:hover { transform: scale(1.03); }
.card:active { transform: scale(0.98); }

.card-face {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  row-gap: clamp(4px, .6vw, 8px);
  min-height: 0;
}

.img {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: 100%;
  object-fit: contain;
  border-radius: var(--radius-sm);
  background: #ffffff; /* white mat behind images for consistency */
}

/* Labels — tokenized; PDF clone will hard-code via JS */
.label {
  flex: 0 0 auto;
  width: 100%;
  display: grid;
  place-items: center;
  padding: clamp(6px, 1.1vw, 10px) clamp(6px, 1.2vw, 12px);
  border-radius: var(--radius-sm);
  background: var(--flashcards-label-bg, rgba(255,255,255,0.65));
  border: 1px solid var(--border-main);
  box-shadow: var(--shadow-flashcards);
  max-height: 32%;
  overflow: hidden;
}
.en {
  display: inline-block;
  font-weight: 900;
  font-size: clamp(13px, 1.5vw, 20px);
  color: var(--text-flashcards);
  text-align: center;
  line-height: 1.15;
  word-break: break-word;
  white-space: pre-wrap;
}

/* Free space full-card layout */
.free-full { display: grid; place-items: center; width: 100%; height: 100%; }
.free-text { font-weight: 1000; font-size: clamp(22px, 2.6vw, 36px); color: var(--text-flashcards); text-align: center; line-height: 1.1; }

/* Mark ring — tokenized for live view; PDF clone forces #ff0000 */
.mark {
  position: absolute; inset: 8%;
  border-radius: 50%;
  border: clamp(8px, 1.6vw, 14px) solid var(--accent-danger, red);
  pointer-events: none;
}
.mark.soft { opacity: .45; }
.mark.strong { opacity: 1; }

/* Large screens */
@media (min-width: 1280px) {
  .bingo-grid { width: min(86vw, 940px); height: min(calc(100svh - 130px), 940px); }
}
@media (min-width: 1536px) {
  .bingo-grid { width: min(82vw, 900px); height: min(calc(100svh - 140px), 900px); }
}

/* Small screens */
@media (max-width: 520px) {
  .bingo-grid { width: 94vw; height: calc(100svh - 120px); gap: clamp(5px, 1.6vw, 10px); }
}

/* Super Bingo popup — UI only */
.super-bingo {
  position: fixed;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%) scale(1);
  padding: clamp(12px, 2.2vw, 22px) clamp(16px, 3vw, 32px);
  font-weight: 1000;
  font-size: clamp(34px, 6vw, 72px);
  color: #fff;
  background: linear-gradient(180deg, #3b82f6, #1d4ed8);
  border-radius: var(--radius-lg);
  box-shadow: 0 14px 40px rgba(0,0,0,0.28), inset 0 -3px 0 rgba(255,255,255,0.25);
  z-index: 100;
  overflow: hidden;
}
.super-bingo .shine {
  position: absolute;
  top: -50%; left: -20%;
  width: 60%;
  height: 200%;
  transform: rotate(20deg);
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.5), rgba(255,255,255,0));
  animation: shine-sweep 900ms ease-out 250ms 1 forwards;
  pointer-events: none;
}
@keyframes shine-sweep {
  0% { transform: translateX(-120%) rotate(20deg); opacity: 0; }
  30% { opacity: .9; }
  100% { transform: translateX(260%) rotate(20deg); opacity: 0; }
}
.super-pop-enter-from, .super-pop-leave-to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
.super-pop-enter-active, .super-pop-leave-active { transition: all .25s ease; }

/* ===== Print dialog & busy card (tokenized) ===== */
.print-dialog {
  position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
  padding: 1rem 1.25rem; border: 1px solid var(--modal-border, var(--border-main)); border-radius: var(--modal-radius, var(--radius-lg));
  background: var(--modal-surface, var(--surface-main)); color: var(--modal-on-surface, var(--text-main-dark)); max-width: 460px; width: calc(100vw - 2rem);
  z-index: 120; box-shadow: var(--modal-shadow, var(--shadow-main));
}
.print-title { margin: 0 0 .5rem; font-weight: 900; font-size: 1.1rem; }
.print-warning {
  background: var(--warning-bg, #fff7ed); color: var(--warning-on, #7c2d12); border: 1px solid var(--warning-border, #fed7aa); border-radius: var(--radius-md);
  padding: .5rem .65rem; font-size: .92rem; line-height: 1.25; margin-bottom: .65rem;
}
.print-label { display: grid; gap: 6px; font-weight: 700; margin-bottom: .6rem; }
.print-input {
  border: 1px solid var(--modal-border, var(--border-main)); border-radius: var(--radius-md);
  background: var(--modal-surface-weak, var(--surface-main-weak));
  color: var(--modal-on-surface, var(--text-main-dark)); padding: 8px 10px; width: 140px;
}
.print-check { display: flex; align-items: center; gap: .55rem; margin: .25rem 0 .4rem; font-weight: 700; color: var(--modal-on-surface, var(--text-main-dark)); }
.print-hint { margin: .25rem 0 .6rem; font-size: .92rem; color: var(--modal-on-surface-soft, var(--text-main-soft)); }
.print-actions { display: flex; gap: .5rem; justify-content: flex-end; margin-top: .5rem; }
.progress { margin-top: .5rem; font-size: .95rem; }

.busy-card {
  background: var(--modal-surface, var(--surface-main)); color: var(--modal-on-surface, var(--text-main-dark)); border: 1px solid var(--modal-border, var(--border-main));
  border-radius: var(--modal-radius, var(--radius-lg)); padding: 16px 18px; box-shadow: var(--modal-shadow, var(--shadow-main));
  display: flex; align-items: center; gap: 10px; font-weight: 800;
}
.spinner { width: 18px; height: 18px; border: 3px solid rgba(0,0,0,.15); border-top-color: rgba(0,0,0,.6); border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
