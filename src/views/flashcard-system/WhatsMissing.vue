<!-- src/views/flashcard-system/WhatsMissingGame.vue -->
<template>
  <section class="whats-missing-page">
    <!-- Back Button -->
    <button class="home-button" type="button" @click="onExit" aria-label="Back">
      <img :src="homeIcon" alt="" />
    </button>

    <!-- Settings Button + Drop-down -->
    <div class="settings-wrap" ref="settingsWrap">
      <button class="settings-button" type="button" @click="openSettings" aria-haspopup="menu"
        :aria-expanded="showSettings" aria-controls="settings-menu">
        <img :src="settingsIcon" alt="" />
      </button>

      <!-- Full-screen blurred backdrop (covers game area, not menu) -->
      <div v-if="showSettings" class="settings-backdrop" @click="closeSettings" aria-hidden="true"></div>

      <!-- Drop-down with open/close animation -->
      <Transition name="settings-drop">
        <div v-if="showSettings" id="settings-menu" class="settings-dropdown" role="menu">
          <div class="settings-section" role="none">
            <div class="settings-row" role="none">
              <label class="settings-label" for="displayCount">Displayed</label>
              <select id="displayCount" v-model.number="displayCountDraft" class="settings-select">
                <option v-for="n in displayOptions" :key="n" :value="n">
                  {{ n }} cards
                </option>
              </select>
            </div>

            <div class="settings-row" role="none">
              <label class="settings-label" for="missingCount">Missing</label>
              <select id="missingCount" v-model.number="missingCountDraft" class="settings-select">
                <option v-for="n in missingOptions" :key="n" :value="n">
                  {{ n }} missing
                </option>
              </select>
            </div>

            <!-- Instant toggle (no reshuffle/reselect) -->
            <div class="settings-row toggle-row" role="none">
              <div class="toggle-title">Show English</div>
              <label class="switch" aria-label="Toggle Show English">
                <input type="checkbox" v-model="showEnglish" />
                <span class="slider"></span>
              </label>
            </div>

            <div class="settings-actions" role="none">
              <button class="btn ghost" type="button" @click="resetRound(true)">Reset</button>
              <button class="btn primary" type="button" @click="applySettings">Apply</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <header class="page-head">
      <h1 class="title">What's Missing?</h1>
    </header>

    <section class="game-actions">
      <button class="shuffle-btn" type="button" @click="shuffleAndRemove" :disabled="isDealing || !cards.length">
        Shuffle
      </button>
    </section>

    <!-- Grid -->
    <section class="cards-section">
      <div v-if="gridSlots.length" class="card-grid" aria-live="polite">
        <div v-for="slot in gridSlots" :key="slot.key" class="card" :class="[
          { 'drop-in': slot.dropIn },
          { 'wrong-guess': slot.wrongGuess },
          { blank: slot.type === 'blank' && !slot.revealed },
          { revealed: slot.type === 'blank' && slot.revealed },
          { pop: slot.type === 'blank' && slot.pop },
          { 'do-flip': slot.type === 'blank' && slot.revealed && slot.flip }
        ]">

          <!-- NORMAL CARD -->
          <template v-if="slot.type === 'card' && slot.card">
            <div class="card-content">
              <div class="img-wrap" v-if="slot.card.image_url">
                <img :src="slot.card.image_url" :alt="slot.card.english || 'card'" loading="lazy"
                  referrerpolicy="no-referrer" @error="onImgError($event)" />
              </div>
              <div class="no-img" v-else>No Image</div>

              <p class="card-text" v-if="showEnglish && slot.card.english">
                {{ slot.card.english }}
              </p>
            </div>
          </template>

          <!-- BLANK SLOT  -->
          <template v-else-if="slot.type === 'blank'">
            <div class="flip-scene">
              <!-- Single visible face; we animate the container for a "flip" feel
                   AFTER the reveal is already shown. -->
              <div class="flip-plate">
                <!-- Hidden face (question mark) -->
                <div v-if="!slot.revealed" class="blank-face" :style="blankFaceStyle">
                  <span class="sr-only">Hidden card</span>
                </div>

                <!-- Revealed card (shown BEFORE animation) -->
                <div v-else class="reveal-face">
                  <template v-if="slot.revealCard">
                    <div class="card-content">
                      <div class="img-wrap" v-if="slot.revealCard.image_url">
                        <img :src="slot.revealCard.image_url" :alt="slot.revealCard.english || 'card'" loading="lazy"
                          referrerpolicy="no-referrer" @error="onImgError($event)" />
                      </div>
                      <div class="no-img" v-else>No Image</div>

                      <p class="card-text" v-if="showEnglish && slot.revealCard.english">
                        {{ slot.revealCard.english }}
                      </p>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <p v-else class="muted">No cards loaded. Go back and select some cards.</p>
    </section>

    <!-- Guess Section -->
    <section class="guess-section" v-if="showGuessSection && cards.length">
      <h2 class="guess-title">What card is missing?</h2>
      <div class="guess-options">
        <button v-for="c in cards" :key="cardKey(c)" class="guess-btn" type="button"
          :disabled="disabledGuessKeys.has(cardKey(c)) || allMissingFound" @click="checkGuess(c)">
          {{ c.english || "Unknown" }}
        </button>
      </div>
    </section>

    <!-- Audio -->
    <audio ref="correctAudio" :src="correctSfx" preload="auto" />
    <audio ref="shuffleAudio" :src="shuffleSfx" preload="auto" />
    <audio ref="selectAudio" :src="selectSfx" preload="auto" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useGameTransitStore, type Flashcard as TransitCard } from "@/stores/gameTransit";

const router = useRouter();
const transit = useGameTransitStore();

const TRANSIT_KEY = "eitake.whatsmissing.transit.v10";

/** Assets */
const homeIcon = new URL("@/assets/images/icons/back-icon.png", import.meta.url).toString();
const settingsIcon = new URL("@/assets/images/icons/settings-icon.png", import.meta.url).toString();
const questionMark = new URL("@/assets/images/game-icons/question-mark.png", import.meta.url).toString();

/** SFX */
const correctSfx = new URL("@/assets/sounds/harp strum 3.wav", import.meta.url).toString();
const shuffleSfx = new URL("@/assets/sounds/cards-shuffle-sfx-01.mp3", import.meta.url).toString();
const selectSfx = new URL("@/assets/sounds/arcade_beep_01.mp3", import.meta.url).toString();

const props = withDefaults(
  defineProps<{
    cards?: TransitCard[];
    defaultDisplayed?: number;
    defaultMissing?: number;
    defaultShowEnglish?: boolean;
  }>(),
  {
    defaultDisplayed: 21,
    defaultMissing: 1,
    defaultShowEnglish: true,
  }
);

/** Settings menu */
const showSettings = ref(false);
const settingsWrap = ref<HTMLElement | null>(null);

function openSettings() {
  showSettings.value = true;
  displayCountDraft.value = displayCount.value;
  missingCountDraft.value = missingCount.value;
}
function closeSettings() {
  showSettings.value = false;
}

/** Pool */
const allCards = ref<TransitCard[]>([]);

/** Game state */
type GridSlot =
  | { key: string; type: "card"; card: TransitCard; dropIn: boolean; wrongGuess: boolean }
  | {
    key: string;
    type: "blank";
    card: null;
    dropIn: boolean;
    wrongGuess: boolean;

    revealed: boolean; // content visible immediately when true
    revealCard: TransitCard | null;

    // animation flags
    flip: boolean; // celebratory flip after reveal
    pop: boolean; // bounce + glow
  };

const cards = ref<TransitCard[]>([]);
const gridSlots = ref<GridSlot[]>([]);
const missingCards = ref<TransitCard[]>([]);
const showGuessSection = ref(false);

const disabledGuessKeys = reactive(new Set<string>());
const isDealing = ref(false);

const showEnglish = ref<boolean>(!!props.defaultShowEnglish);

/** Settings values */
const displayCount = ref<number>(props.defaultDisplayed);
const missingCount = ref<number>(props.defaultMissing);

const displayCountDraft = ref<number>(displayCount.value);
const missingCountDraft = ref<number>(missingCount.value);

const allMissingFound = computed(() => showGuessSection.value && missingCards.value.length === 0);

/** Options */
const displayOptions = computed(() => {
  const max = Math.max(1, allCards.value.length || 1);
  const start = Math.min(6, max);
  const opts: number[] = [];
  for (let i = start; i <= max; i++) opts.push(i);
  return opts;
});

const missingOptions = computed(() => {
  const maxMissing = Math.max(1, displayCountDraft.value - 1);
  const opts: number[] = [];
  for (let i = 1; i <= maxMissing; i++) opts.push(i);
  return opts;
});

/** Blank face style */
const blankFaceStyle = computed(() => ({
  backgroundColor: "lightgreen",
  backgroundImage: `url('${questionMark}')`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
}));

/** Audio refs */
const correctAudio = ref<HTMLAudioElement | null>(null);
const shuffleAudio = ref<HTMLAudioElement | null>(null);
const selectAudio = ref<HTMLAudioElement | null>(null);

function safePlay(el: HTMLAudioElement | null) {
  try {
    if (!el) return;
    el.currentTime = 0;
    void el.play();
  } catch {
    /* ignore */
  }
}

/** Transit persistence */
function persistSession() {
  try {
    sessionStorage.setItem(TRANSIT_KEY, JSON.stringify({ cards: allCards.value }));
  } catch {
    /* ignore */
  }
}

function hydrateFromSession() {
  try {
    const raw = sessionStorage.getItem(TRANSIT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.cards) && parsed.cards.length) {
      transit.set({ cards: parsed.cards });
    }
  } catch {
    /* ignore */
  }
}

/** Utils */
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

function clampInt(n: number, min: number, max: number) {
  const v = Number.isFinite(n) ? Math.floor(n) : min;
  return Math.max(min, Math.min(max, v));
}

function cardKey(card: TransitCard) {
  const anyCard: any = card as any;
  return String(anyCard?.id ?? card.image_url ?? card.english ?? Math.random());
}

/** UI glue */
function onExit() {
  try {
    router.back();
  } catch {
    /* ignore */
  }
}

function onDocPointerDown(e: PointerEvent) {
  if (!showSettings.value) return;
  const wrap = settingsWrap.value;
  if (!wrap) return;
  if (wrap.contains(e.target as Node)) return;
  closeSettings();
}

/** Core gameplay */
function resetRound(selectNew: boolean) {
  disabledGuessKeys.clear();
  showGuessSection.value = false;
  missingCards.value = [];

  if (!allCards.value.length) {
    cards.value = [];
    gridSlots.value = [];
    return;
  }

  const maxDisplayed = Math.max(1, Math.min(allCards.value.length, displayCount.value));
  displayCount.value = maxDisplayed;

  const maxMissing = Math.max(1, maxDisplayed - 1);
  missingCount.value = clampInt(missingCount.value, 1, maxMissing);

  cards.value = selectNew ? pickRandomUnique(allCards.value, maxDisplayed) : pickRandomUnique(allCards.value, maxDisplayed);

  gridSlots.value = cards.value.map((c, idx) => ({
    key: `card-${idx}-${cardKey(c)}`,
    type: "card",
    card: c,
    dropIn: false,
    wrongGuess: false,
  }));
}

async function shuffleAndRemove() {
  if (isDealing.value || !cards.value.length) return;

  safePlay(shuffleAudio.value);

  isDealing.value = true;
  showGuessSection.value = false;
  disabledGuessKeys.clear();

  const temp = [...cards.value];
  shuffleInPlace(temp);

  const removed: TransitCard[] = [];
  const toRemove = clampInt(missingCount.value, 1, Math.max(1, temp.length - 1));

  for (let i = 0; i < toRemove; i++) {
    const idx = Math.floor(Math.random() * temp.length);
    removed.push(temp.splice(idx, 1)[0]);
  }

  missingCards.value = removed;

  gridSlots.value = [];
  const delay = 50;

  for (let i = 0; i < temp.length; i++) {
    const c = temp[i];
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, i === 0 ? 0 : delay));
    gridSlots.value.push({
      key: `deal-card-${i}-${cardKey(c)}-${Date.now()}`,
      type: "card",
      card: c,
      dropIn: true,
      wrongGuess: false,
    });
  }

  for (let i = 0; i < toRemove; i++) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delay));
    gridSlots.value.push({
      key: `deal-blank-${i}-${Date.now()}`,
      type: "blank",
      card: null,
      dropIn: true,
      wrongGuess: false,
      revealed: false,
      revealCard: null,
      flip: false,
      pop: false,
    });
  }

  showGuessSection.value = true;
  isDealing.value = false;
}

function findSlotByImage(url?: string) {
  if (!url) return -1;
  return gridSlots.value.findIndex((s) => s.type === "card" && s.card?.image_url === url);
}

function disableAllGuessButtons() {
  for (const c of cards.value) disabledGuessKeys.add(cardKey(c));
}

/**
 * Reveal FIRST (content visible immediately), then animate.
 * This matches your request: "reveal before the animation happens."
 */
async function revealNextBlankWithCard(card: TransitCard) {
  const blankIdx = gridSlots.value.findIndex((s) => s.type === "blank" && !s.revealed);
  if (blankIdx === -1) return;

  const slot = gridSlots.value[blankIdx];
  if (slot.type !== "blank") return;

  // 1) Set content + revealed immediately (so it shows right away)
  slot.revealCard = card;
  slot.revealed = true;

  // Ensure DOM paints the revealed card first
  await nextTick();

  // 2) Now fire the flip+scale animation (single play)
  slot.flip = false;
  await nextTick();
  slot.flip = true;

  window.setTimeout(() => {
    const s = gridSlots.value[blankIdx];
    if (s && s.type === "blank") s.flip = false;
  }, 620);

}

function checkGuess(selectedCard: TransitCard) {
  const key = cardKey(selectedCard);
  if (disabledGuessKeys.has(key) || allMissingFound.value) return;

  const isCorrect = missingCards.value.some((c) => cardKey(c) === key);

  if (isCorrect) {
    safePlay(correctAudio.value);

    void revealNextBlankWithCard(selectedCard);

    missingCards.value = missingCards.value.filter((c) => cardKey(c) !== key);

    if (missingCards.value.length === 0) {
      disableAllGuessButtons();
    } else {
      disabledGuessKeys.add(key);
    }
  } else {
    safePlay(selectAudio.value);

    const idx = findSlotByImage(selectedCard.image_url);
    if (idx !== -1) {
      gridSlots.value[idx].wrongGuess = false;
      setTimeout(() => {
        if (!gridSlots.value[idx]) return;
        gridSlots.value[idx].wrongGuess = true;
        setTimeout(() => {
          if (!gridSlots.value[idx]) return;
          gridSlots.value[idx].wrongGuess = false;
        }, 500);
      }, 0);
    }

    setTimeout(() => disabledGuessKeys.add(key), 500);
  }
}

function applySettings() {
  if (!allCards.value.length) return;

  const maxDisplayed = Math.max(1, Math.min(allCards.value.length, displayCountDraft.value));
  const maxMissing = Math.max(1, maxDisplayed - 1);
  const newMissing = clampInt(missingCountDraft.value, 1, maxMissing);

  displayCount.value = maxDisplayed;
  missingCount.value = newMissing;

  resetRound(true);
  closeSettings();
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement | null;
  if (!img) return;
  img.style.display = "none";
}

watch(displayCountDraft, (val) => {
  const max = Math.max(1, Math.min(allCards.value.length || 1, val));
  if (val !== max) displayCountDraft.value = max;
  const maxMissing = Math.max(1, max - 1);
  if (missingCountDraft.value > maxMissing) missingCountDraft.value = maxMissing;
});

onMounted(() => {
  document.addEventListener("pointerdown", onDocPointerDown);

  const source = (props.cards?.length ? props.cards : transit.cards) as TransitCard[];
  if (!source?.length) hydrateFromSession();

  const finalSource = (props.cards?.length ? props.cards : transit.cards) as TransitCard[];
  allCards.value = Array.isArray(finalSource) ? [...finalSource] : [];
  persistSession();

  if (!allCards.value.length) {
    cards.value = [];
    gridSlots.value = [];
    return;
  }

  displayCount.value = clampInt(props.defaultDisplayed, 1, allCards.value.length);
  missingCount.value = clampInt(props.defaultMissing, 1, Math.max(1, displayCount.value - 1));
  displayCountDraft.value = displayCount.value;
  missingCountDraft.value = missingCount.value;

  resetRound(true);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onDocPointerDown);
});
</script>

<style scoped>
.whats-missing-page {
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

.home-button {
  left: 10px;
}

.settings-wrap {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 80;
}

.settings-button {
  position: static;
}

.home-button img,
.settings-button img {
  width: 38px;
  height: 38px;
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.35)) drop-shadow(0 10px 18px rgba(0, 0, 0, 0.18));
}

.home-button:hover {
  transform: scale(1.08) rotate(-4deg);
}

.settings-button:hover {
  transform: scale(1.08) rotate(4deg);
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

.settings-section {
  padding: 12px;
}

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

.settings-select:focus-visible {
  box-shadow: var(--focus-ring);
}

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
.switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 30px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

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

.switch input:checked+.slider {
  background: color-mix(in srgb, var(--btn-secondary-bg) 35%, var(--neutral-0) 65%);
  border-color: var(--btn-secondary-border);
}

.switch input:checked+.slider:before {
  transform: translateX(22px);
}

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

/* Settings menu animations */
.settings-drop-enter-active {
  animation: dropIn 180ms ease-out both;
}

.settings-drop-leave-active {
  animation: slideUpOut 160ms ease-in both;
}

@keyframes dropIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideUpOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.98);
  }
}

/* Actions */
.game-actions {
  display: grid;
  place-items: center;
  padding-top: 8px;
}

.shuffle-btn {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--btn-primary-border);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-on);
  font-weight: 950;
  cursor: pointer;
  transition: transform 140ms ease, filter 140ms ease;
}

.shuffle-btn:hover {
  transform: scale(1.04);
  filter: brightness(1.04);
}

.shuffle-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Grid */
.cards-section {
  padding: clamp(12px, 2.2vw, 20px);
  display: grid;
  place-items: center;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 20px;
  margin: 20px;
  justify-items: center;
  width: 90%;
}

.card {
  width: 120px;
  height: 168px;
  background: #ffffff;
  border-radius: var(--radius-lg);
  border: 1px solid var(--flashcards-border);
  box-shadow: var(--flashcards-shadow);
  overflow: hidden;
  display: grid;
  place-items: center;
  position: relative;
  transform: translateZ(0);
}

.card.blank {
  border: 1px solid color-mix(in srgb, var(--flashcards-border) 50%, #000 0%);
}

.card-content {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.img-wrap {
  position: absolute;
  inset: 8px;
  display: grid;
  place-items: center;
}

.img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-img {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--modal-on-surface-soft);
  opacity: 0.85;
  font-size: 12px;
}

.card-text {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid color-mix(in srgb, var(--flashcards-border) 28%, transparent 72%);
  border-radius: var(--radius-md);
  padding: 6px 8px;
  font-weight: 950;
  color: #000;
  text-align: center;
  line-height: 1.1;
  font-size: 13px;
  max-height: 52%;
  overflow: hidden;
}

/* ---------- Reveal + Celebrate (reveal first, then flip/bounce/glow) ---------- */
.flip-scene {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  perspective: 1100px;
}

.flip-plate {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform, filter;
}

.blank-face,
.reveal-face {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
}

.reveal-face {
  background: #fff;
}


/* Flip + scale the ENTIRE card (border/shadow included), and do NOT end at 180deg */
.card.do-flip {
  transform-style: preserve-3d;
  transform-origin: center;
  will-change: transform;
  animation: revealFlipScale 620ms cubic-bezier(0.18, 0.9, 0.22, 1.05) both;
}

@keyframes revealFlipScale {
  0% {
    transform: rotateY(-90deg) scale(1);
  }
  55% {
    transform: rotateY(0deg) scale(1.12);
  }
  100% {
    transform: rotateY(0deg) scale(1);
  }
}



/* Existing animations */
@keyframes dropInCard {
  from {
    transform: translateY(-18px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.drop-in {
  animation: dropInCard 220ms ease-out both;
}

@keyframes flashYellow {
  0% {
    background-color: yellow;
    transform: scale(1);
  }

  50% {
    background-color: yellow;
    transform: scale(1.08);
  }

  100% {
    background-color: white;
    transform: scale(1);
  }
}

.wrong-guess {
  animation: flashYellow 0.5s ease-in-out;
}

.muted {
  text-align: center;
  color: var(--main-text-soft);
  padding: 30px 16px;
}

/* Guess section (kept EXACTLY as you provided) */
.guess-section {
  padding: 8px 14px 22px;
}

.guess-title {
  margin: 14px 0 10px;
  font-family: var(--main-title-font);
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
  font-size: clamp(16px, 2.0vh, 22px);
  text-align: center;
}

.guess-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.guess-btn {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--btn-secondary-border);
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-on);
  font-weight: 900;
  cursor: pointer;
  transition: transform 140ms ease, filter 140ms ease;
}

.guess-btn:hover {
  transform: scale(1.04);
  filter: brightness(1.04);
}

.guess-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 520px) {
  .settings-row {
    grid-template-columns: 1fr;
  }

  .settings-dropdown {
    width: min(360px, calc(100vw - 12px));
  }
}

/* ---------- Responsive (match Sharknado) ---------- */
@media (max-width: 400px) {
  .card-grid {
    gap: 8px;
    margin: 12px;
    grid-template-columns: repeat(3, minmax(72px, 1fr));
    justify-items: stretch;
  }

  .card {
    width: 100%;
    min-width: 72px;
    aspect-ratio: 5 / 8;
    height: auto;
  }
}

@media (min-width: 401px) and (max-width: 520px) {
  .card-grid {
    gap: 10px;
    margin: 14px;
    grid-template-columns: repeat(3, minmax(78px, 1fr));
    justify-items: stretch;
  }

  .card {
    width: 100%;
    min-width: 78px;
    aspect-ratio: 5 / 8;
    height: auto;
  }
}

@media (min-width: 521px) and (max-width: 768px) {
  .card-grid {
    gap: 12px;
    margin: 16px;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  }

  .card {
    width: 100%;
    min-width: 92px;
    aspect-ratio: 5 / 7;
    height: auto;
  }
}

@media (min-width: 769px) and (max-width: 1023px) {
  .card-grid {
    gap: 14px;
    margin: 18px;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }

  .card {
    width: 100%;
    min-width: 110px;
    aspect-ratio: 5 / 7;
    height: auto;
  }
}

@media (min-width: 1024px) {
  .card {
    width: 140px;
    height: 180px;
  }

  .card-grid {
    gap: 24px;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}

@media (min-width: 1440px) {
  .card {
    width: 160px;
    height: 200px;
  }

  .card-grid {
    gap: 28px;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}

@media (min-width: 1920px) {
  .card {
    width: 200px;
    height: 260px;
  }

  .card-grid {
    gap: 32px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

/* Accessibility: reduce motion */
@media (prefers-reduced-motion: reduce) {
  .card.do-flip {
    animation: none !important;
  }
}


/* SR-only utility */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
</style>
