<!-- src/views/JapaneseFlashcardReview.vue -->
<template>
  <section class="flashcards-page" :class="pageClass">
    <!-- Back -->
    <button class="home-button" type="button" @click="goBack" aria-label="Back">
      <img :src="homeIcon" alt="Back" />
    </button>

    <!-- Settings Button -->
    <button
      class="settings-button"
      type="button"
      @click="toggleSettingsMenu"
      aria-haspopup="dialog"
      :aria-expanded="showSettings"
    >
      <img :src="settingsIcon" alt="Settings" />
    </button>

    <!-- Settings Menu -->
    <div
      id="settings-menu"
      class="settings-menu"
      v-show="showSettings"
      role="dialog"
      :aria-modal="false"
      :aria-hidden="!showSettings"
    >
      <button
        id="toggle-japanese-btn"
        class="toggle-btn"
        :class="{ off: !showJapanese }"
        type="button"
        @click="showJapanese = !showJapanese"
      >
        {{ showJapanese ? "Hide Japanese" : "Show Japanese" }}
      </button>

      <button
        id="toggle-image-btn"
        class="toggle-btn"
        :class="{ off: !showImage }"
        type="button"
        @click="showImage = !showImage"
      >
        {{ showImage ? "Hide Image" : "Show Image" }}
      </button>

      <button id="auto-mode-btn" type="button" :class="{ on: autoMode }" @click="toggleAutoMode">
        Auto Mode: {{ autoMode ? "ON" : "OFF" }}
      </button>
    </div>

    <!-- Click zones (disabled when finished) -->
    <div v-if="!finished" id="left-screen" class="screen-half" @click="previousCard" aria-hidden="true"></div>
    <div v-if="!finished" id="right-screen" class="screen-half" @click="revealOrNextCard" aria-hidden="true"></div>

    <!-- Flashcard -->
    <div id="flashcard" class="flashcard-container fade" :class="cardContainerClass" @click="revealOrNextCard">
      <div class="card-content" v-if="!finished">
        <!-- In Japanese MODE, JP & image are revealed (not shown at start) -->
        <div class="image-container" v-if="revealed && showImage">
          <img id="card-image" :src="currentImage" alt="" />
        </div>

        <div class="japanese-container" v-if="revealed && showJapanese">
          <ruby id="japanese-text">
            <span id="kanji">{{ currentCard?.japanese?.kanji || "" }}</span>
            <rt id="furigana">{{ currentCard?.japanese?.furigana || "" }}</rt>
          </ruby>
        </div>
      </div>

      <!-- English banner (visible from the start in this mode) -->
      <div class="english-container" v-if="!finished">
        <div class="english" id="english-text">{{ currentCard?.english || "" }}</div>
      </div>

      <!-- Finished overlay -->
      <div v-if="finished" class="finished-overlay">
        <div class="finished-card">
          <h2>Good Job!</h2>
          <p>Heading back…</p>
        </div>
      </div>
    </div>

    <!-- progress hint (optional) -->
    <div v-if="!finished" class="progress" aria-live="polite">{{ progressText }}</div>

    <audio ref="finishAudioRef" :src="finishSound" preload="auto"></audio>
  </section>
</template>

<script setup lang="ts">
/**
 * JapaneseFlashcardReview.vue
 * - EN shows first; JP+image reveal on click.
 * - Works for premade (v_deck_cards_expanded) and custom (v_custom_deck_cards_expanded).
 * - Unified image resolver: all images come from public-assets unless explicit full public path or absolute URL.
 * - Always shuffles for Japanese mode.
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
import { withLoading } from "@/utils/withLoading";

type CardRow = {
  deck_id?: string;
  card_id: string;
  position?: number | null;
  english: string | null;
  japanese_kanji?: string | null;
  japanese_furigana?: string | null;
  image_url?: string | null;
};
type Card = {
  id: string;
  english: string;
  japanese: { kanji?: string; furigana?: string };
  image_url?: string;
};

const route = useRoute();
const router = useRouter();

/* -------- assets -------- */
const homeIcon = new URL("@/assets/images/icons/home-icon.png", import.meta.url).href; // visible path
const settingsIcon = new URL("@/assets/images/icons/settings-icon.png", import.meta.url).href;
const finishSound = new URL("@/assets/sounds/fanfare.mp3", import.meta.url).href;
const finishAudioRef = ref<HTMLAudioElement | null>(null);

/* -------- settings state -------- */
const showSettings = ref(false);
const showJapanese = ref(true);
const showImage = ref(true);
const autoMode = ref(false);
const autoDelayMs = ref(2000);
let autoTimer: number | null = null;

/* -------- review state -------- */
const deckId = ref<string>("");
const selectedIds = ref<string[] | null>(null);
const mode = ref<"review" | "random" | "japanese">("japanese");

const title = ref<string>("");
const cards = ref<Card[]>([]);
const idx = ref(0);
const revealed = ref(false);
const finished = ref(false);

/* -------- buckets -------- */
const PUBLIC_BUCKET = "public-assets";
const PUBLIC_PREFIX = `${PUBLIC_BUCKET}/`;

/* -------- helpers -------- */
function toggleSettingsMenu() {
  showSettings.value = !showSettings.value;
}
function goBack() {
  router.back();
}

function isAbsoluteUrl(u?: string | null): boolean {
  return !!u && /^https?:\/\//i.test(u);
}

/** One canonical resolver: default to public-assets for any bare key */
function toPublicUrlSmart(path?: string | null): string {
  if (!path) return "";
  if (isAbsoluteUrl(path)) return path;

  // If stored as /storage/v1/object/public/<bucket>/<key>
  const pub = path.replace(/^\/+/, "").match(/^storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (pub) {
    const [, bucket, key] = pub;
    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
    return data?.publicUrl ?? "";
  }

  // If someone saved with bucket prefix, strip it for public-assets
  if (path.startsWith(PUBLIC_PREFIX)) {
    const key = path.slice(PUBLIC_PREFIX.length);
    const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(key);
    return data?.publicUrl ?? "";
  }

  // Bare key → treat as a key inside public-assets (premade + custom)
  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? "";
}

function parseIdsParam(q: Record<string, any>): string[] | null {
  const raw = q.ids ?? q.cardIds ?? null;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return null;
}
function parseModeParam(q: Record<string, any>): "review" | "random" | "japanese" {
  const m = String(q.mode || "").toLowerCase();
  if (m === "random") return "random";
  if (m === "japanese") return "japanese";
  return "review";
}

function resolveFromRoute() {
  const p = route.params as Record<string, any>;
  const q = route.query as Record<string, any>;
  deckId.value = (p.id ?? p.deckId ?? q.id ?? "") as string;
  selectedIds.value = parseIdsParam(q);
  mode.value = parseModeParam(q) || "japanese";
}
resolveFromRoute();

/* -------- computed -------- */
const total = computed(() => cards.value.length);
const currentCard = computed<Card | null>(() => cards.value[idx.value] ?? null);
const currentImage = computed(() => (currentCard.value?.image_url ? currentCard.value.image_url : ""));
const progressText = computed(() => (total.value ? `${idx.value + 1} / ${total.value}` : ""));

const pageClass = computed(() => ({
  "image-hidden": !showImage.value,
  "japanese-hidden": !showJapanese.value,
}));

const cardContainerClass = computed(() => ({
  "image-hidden": !showImage.value,
  "japanese-hidden": !showJapanese.value,
}));

/* -------- shuffling -------- */
function shuffleCards<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* -------- auto mode -------- */
function clearAutoTimer() {
  if (autoTimer) {
    window.clearTimeout(autoTimer);
    autoTimer = null;
  }
}
function scheduleAutoStep() {
  clearAutoTimer();
  if (!autoMode.value || finished.value || total.value === 0) return;

  autoTimer = window.setTimeout(() => {
    if (!autoMode.value || finished.value) return;

    if (!revealed.value) {
      revealed.value = true; // reveal JP+image
      scheduleAutoStep();
    } else {
      nextCard();
      if (!finished.value) scheduleAutoStep();
    }
  }, autoDelayMs.value);
}
function toggleAutoMode() {
  autoMode.value = !autoMode.value;
  scheduleAutoStep();
}

/* -------- main actions -------- */
function revealOrNextCard() {
  if (!total.value || finished.value) return;
  if (!revealed.value) {
    revealed.value = true; // reveal JP+image
  } else {
    nextCard();
  }
  scheduleAutoStep();
}
function previousCard() {
  if (!total.value || finished.value) return;
  if (idx.value > 0) {
    idx.value -= 1;
    revealed.value = false; // back to EN-only
  }
  scheduleAutoStep();
}
function nextCard() {
  if (!total.value || finished.value) return;
  if (idx.value < total.value - 1) {
    idx.value += 1;
    revealed.value = false; // next starts EN-only
  } else {
    revealed.value = true;
    finished.value = true;
    clearAutoTimer();
    finishAudioRef.value?.play().catch(() => {});
    setTimeout(() => goBack(), 2000);
  }
}

/* -------- data loading (premade + custom) -------- */
async function loadPremade(): Promise<Card[]> {
  const { data: deckRow } = await supabase
    .from("decks")
    .select("id, title, slug")
    .eq("id", deckId.value)
    .maybeSingle();
  title.value = deckRow?.title || deckRow?.slug || "Flashcards";

  const { data: rows, error } = await supabase
    .from("v_deck_cards_expanded")
    .select(`
      deck_id,
      card_id,
      position,
      english,
      japanese_kanji,
      japanese_furigana,
      image_url
    `)
    .eq("deck_id", deckId.value)
    .order("position", { ascending: true });

  if (error) throw error;

  let mapped: Card[] = (rows ?? []).map((r: CardRow) => ({
    id: r.card_id,
    english: r.english || "",
    japanese: {
      kanji: r.japanese_kanji || undefined,
      furigana: r.japanese_furigana || undefined,
    },
    image_url: toPublicUrlSmart(r.image_url || ""),
  }));

  if (selectedIds.value?.length) {
    const set = new Set(selectedIds.value);
    mapped = mapped.filter((c) => set.has(c.id));
  }

  // Always shuffle for Japanese mode; also if ?mode=random
  if (mode.value === "japanese" || mode.value === "random") {
    mapped = shuffleCards(mapped);
  }
  return mapped;
}

async function loadCustom(): Promise<Card[]> {
  // Optional title from custom_decks
  const { data: cdeck } = await supabase
    .from("custom_decks")
    .select("id, title")
    .eq("id", deckId.value)
    .maybeSingle();
  if (cdeck?.title) title.value = cdeck.title;

  // Try with deck_id first
  let { data: rows, error } = await supabase
    .from("v_custom_deck_cards_expanded")
    .select(`
      card_id,
      position,
      english,
      japanese_kanji,
      japanese_furigana,
      image_url
    `)
    .eq("deck_id", deckId.value)
    .order("position", { ascending: true });

  // If none, fall back to filtering by custom_deck_id (no alias in the select to keep TS happy)
  if (!error && (!rows || rows.length === 0)) {
    const alt = await supabase
      .from("v_custom_deck_cards_expanded")
      .select(`
        card_id,
        position,
        english,
        japanese_kanji,
        japanese_furigana,
        image_url
      `)
      .eq("custom_deck_id", deckId.value)
      .order("position", { ascending: true });
    if (alt.error) error = alt.error;
    else rows = alt.data ?? [];
  }

  if (error) throw error;

  let mapped: Card[] = (rows ?? []).map((r: CardRow) => ({
    id: r.card_id,
    english: r.english || "",
    japanese: {
      kanji: r.japanese_kanji || undefined,
      furigana: r.japanese_furigana || undefined,
    },
    image_url: toPublicUrlSmart(r.image_url || ""),
  }));

  if (selectedIds.value?.length) {
    const set = new Set(selectedIds.value);
    mapped = mapped.filter((c) => set.has(c.id));
  }

  if (mode.value === "japanese" || mode.value === "random") {
    mapped = shuffleCards(mapped);
  }
  return mapped;
}

async function loadDeck() {
  finished.value = false;
  revealed.value = false;
  idx.value = 0;

  if (!deckId.value) throw new Error("Missing deck id in route.");

  // Try premade first (keeps original behavior); if empty, load custom.
  let premade: Card[] = [];
  try { premade = await loadPremade(); } catch { /* ignore */ }

  if (premade.length) {
    cards.value = premade;
  } else {
    try {
      cards.value = await loadCustom();
    } catch {
      cards.value = [];
    }
  }

  idx.value = 0;
  revealed.value = false; // start EN-only
  scheduleAutoStep();
}

/* -------- lifecycle -------- */
onMounted(async () => {
  document.addEventListener("click", onDocClick, { capture: true });
  document.addEventListener("keydown", onKeydown);

  await withLoading(async () => {
    await loadDeck();
  }, 150);
});

onBeforeUnmount(() => {
  clearAutoTimer();
  document.removeEventListener("click", onDocClick, { capture: true } as any);
  document.removeEventListener("keydown", onKeydown);
});

// re-load if route changes deck id / ids list / mode
watch(
  () => route.fullPath,
  async () => {
    resolveFromRoute();
    await withLoading(async () => {
      await loadDeck();
    }, 150);
  }
);

/* -------- UX helpers -------- */
function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement;
  if (showSettings.value && !t.closest(".settings-menu") && !t.closest(".settings-button")) {
    showSettings.value = false;
  }
}
function onKeydown(e: KeyboardEvent) {
  if (finished.value) return;
  const key = e.key.toLowerCase();
  if (key === "arrowright" || key === "d" || e.key === " ") {
    e.preventDefault();
    revealOrNextCard();
  } else if (key === "arrowleft" || key === "a" || e.key === "backspace") {
    e.preventDefault();
    previousCard();
  }
}
</script>

<style scoped>
/* Page scaffold */
.flashcards-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: "Fredoka", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  background-color: #a6c3a0;
  margin: 0;
  padding: 20px;
  position: relative;
}

/* Back/Home Button (top-left) */
.home-button {
  position: absolute;
  top: 20px;
  left: 20px;
  width: 30px;
  height: 30px;
  z-index: 1000;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.home-button img { width: 100%; height: auto; transition: transform .2s; display: block; }
.home-button img:hover { transform: scale(1.1); }

/* Settings Button (top-right) */
.settings-button {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 30px;
  height: 30px;
  z-index: 1000;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.settings-button img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform .18s ease;
  transform-origin: 50% 50%;
  will-change: transform;
}
/* Scale + rotate on the icon only */
.settings-button:hover img,
.settings-button:focus-visible img {
  transform: scale(1.08) rotate(8deg);
}

/* Settings Menu (no hover transform on panel) */
.settings-menu {
  position: absolute;
  top: 60px;
  right: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 2px 2px 10px rgba(0,0,0,.3);
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
  width: 180px;
  text-align: center;
}

.settings-menu button {
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background .2s, transform .15s;
}
.settings-menu button:hover { transform: scale(1.05); }
.toggle-btn { background-color: lightcoral; }
.toggle-btn.off { background-color: #0288d1; }
.toggle-btn:hover { background-color: #d32f2f; }
.toggle-btn.off:hover { background-color: lightskyblue; }

#auto-mode-btn { background-color: red; }
#auto-mode-btn.on { background-color: green; }

/* Clickable halves */
.screen-half {
  position: fixed;
  top: 0;
  width: 50%;
  height: 100%;
  z-index: 1;
}
#left-screen { left: 0; }
#right-screen { right: 0; }

/* Card */
.flashcard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  border-radius: 10px;
  box-shadow: 2px 2px 10px rgba(0,0,0,.2);
  user-select: none;
  overflow: hidden;
  z-index: 10;
}

/* Finished overlay */
.finished-overlay {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60vw;
  min-height: 40vh;
  padding: 40px;
}
.finished-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
  padding: 32px 40px;
  text-align: center;
}
.finished-card h2 {
  margin: 0 0 8px;
  font-size: 36px;
  color: #1b3b6f;
}
.finished-card p {
  margin: 0;
  color: #1b3b6f;
  opacity: .8;
}

/* Upper section */
.card-content {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  height: 80%;
  padding: 20px;
}

.image-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.image-container img { height: auto; max-width: 100%; }

/* Japanese */
.japanese-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-weight: bold;
  white-space: normal;
  line-break: strict;
  overflow-wrap: break-word;
  padding: 10px;
  max-width: 90%;
}
.japanese-container ruby { white-space: normal; line-break: strict; }
.japanese-container #kanji { white-space: normal; line-break: strict; word-break: break-word; }
#furigana { color: #7a7a7a; }

/* Hide image/JP when toggled */
.image-hidden .image-container { display: none; }
.japanese-hidden .japanese-container { display: none; }
.image-hidden .japanese-container,
.japanese-hidden .image-container {
  flex: 2; justify-content: center;
}

/* English banner */
.english-container {
  font-weight: bold;
  background-color: lightblue;
  width: 100%;
  height: 20%;
  display: flex; align-items: center; justify-content: center;
}
.english { color: #1b3b6f; text-align: center; }

/* Fade */
.fade { opacity: 1; transition: opacity .5s ease-in-out; }

/* Progress hint */
.progress {
  margin-top: 10px;
  color: #1b3b6f;
  font-weight: 700;
}

/* Responsive sizing */
@media (min-width: 1440px) {
  .flashcard-container { width: 80vw; height: 85vh; }
  .image-container img { max-width: 60vw; max-height: 60vh; }
  .japanese-container { font-size: 5vw; }
  .english { font-size: 4vw; }
}
@media (min-width: 1000px) and (max-width: 1439px) {
  .flashcard-container { width: 70vw; height: 75vh; }
  .image-container img { max-width: 50vw; max-height: 50vh; }
  .japanese-container { font-size: 4vw; }
  .english { font-size: 3.5vw; }
}
@media (min-width: 600px) and (max-width: 999px) {
  .flashcard-container { width: 85vw; height: 65vh; }
  .image-container img { max-width: 45vw; max-height: 40vh; }
  .japanese-container { font-size: 4vw; }
  .english { font-size: 3vw; }
}
@media (max-width: 599px) {
  .flashcard-container { width: 90vw; max-height: 90vh; }
  .image-container img { max-width: 75vw; max-height: 35vh; }
  .japanese-container { font-size: 6vw; }
  .english { font-size: 5vw; }
  .card-content { flex-direction: column; align-items: center; }
}
</style>
