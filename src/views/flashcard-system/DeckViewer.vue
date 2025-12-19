<!-- src/views/flashcard-system/DeckViewer.vue -->
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "@/lib/supabase";
import { withLoading } from "@/utils/withLoading";
import { useSelectionsStore } from "@/stores/selections";
import { useGameTransitStore } from "@/stores/gameTransit";

/**
 * Virtual scroller (Vue 3 build). Renders only visible rows to keep the grid fast.
 */
const RecycleScroller = defineAsyncComponent<any>(
  () =>
    import("vue-virtual-scroller").then(
      (m: any) => m.RecycleScroller || m.default?.RecycleScroller || m
    )
);
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";

/** =========================
 *  Types
 *  ========================= */
type Card = {
  id: string; // card_id
  english: string;
  japanese?: { kanji?: string; furigana?: string };
  image?: string;
  image_url?: string; // resolved to a full public URL if path-like
  is_bonus?: boolean;
};
type CardRow = { key: number; items: Card[] };

type CustomDeckLite = {
  id: string;
  title: string;
  card_count: number;
  position: number;
};

/** =========================
 *  Game icons (local bundled)
 *  ========================= */
import iconBomb from "@/assets/images/flashcards/game-icons/bomb.png";
import iconSharknado from "@/assets/images/flashcards/game-icons/sharknado.png";
import iconHeadsup from "@/assets/images/flashcards/game-icons/headsup.png";
import iconSpellingblitz from "@/assets/images/flashcards/game-icons/spellingblitz.png";
import iconSpellingguesser from "@/assets/images/flashcards/game-icons/spelling-guesser.png";
import iconSoundMatcher from "@/assets/images/flashcards/game-icons/sound-matcher.png";
import iconBingo from "@/assets/images/flashcards/game-icons/bingo.png";
import iconMemory from "@/assets/images/flashcards/game-icons/matching.png";

/** Key for each game button/menu entry */
type GameKey =
  | "bomb"
  | "sharknado"
  | "headsup"
  | "spellingblitz"
  | "spellingguesser"
  | "soundmatcher"
  | "bingo"
  | "memory";

const ICONS: Record<GameKey, string> = {
  bomb: iconBomb,
  sharknado: iconSharknado,
  headsup: iconHeadsup,
  spellingblitz: iconSpellingblitz,
  spellingguesser: iconSpellingguesser,
  soundmatcher: iconSoundMatcher,
  bingo: iconBingo,
  memory: iconMemory,
};

/**
 * Front-load icons into localStorage as data URLs so they paint instantly from the front.
 */
const ICON_CACHE_KEY_PREFIX = "eitake.iconcache.";
const cachedIconMap = ref<Record<string, string>>({});

function getCacheKey(url: string) {
  const name = url.split("/").pop() || url;
  return ICON_CACHE_KEY_PREFIX + name;
}
async function cacheIconToLocalStorage(url: string) {
  const key = getCacheKey(url);
  if (cachedIconMap.value[key]) return cachedIconMap.value[key];

  const existing = localStorage.getItem(key);
  if (existing) {
    cachedIconMap.value[key] = existing;
    return existing;
  }
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const reader = new FileReader();
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    localStorage.setItem(key, dataUrl);
    cachedIconMap.value[key] = dataUrl;
    return dataUrl;
  } catch {
    return url;
  }
}
async function preloadGameIcons() {
  for (const url of Object.values(ICONS)) {
    cacheIconToLocalStorage(url);
  }
}
const gameIcon = (k: GameKey) => {
  const url = ICONS[k];
  const key = getCacheKey(url);
  return cachedIconMap.value[key] || url;
};

function onIconError(ev: Event) {
  const img = ev.target as HTMLImageElement;
  img.style.visibility = "hidden";
  (img as any).onerror = null;
}

/** =========================
 *  Other constants / helpers
 *  ========================= */
const ASSETS_BUCKET = "public-assets";
const ROW_HEIGHT = 230; // row height for virtual scroller sizing

function toPublicUrl(path?: string | null) {
  if (!path) return "";
  const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? "";
}

/** Simple tagging for game pills in the UI (e.g., NEW or XP) */
type GameTag = "new" | "xp";
const GAME_TAGS: Record<GameKey, GameTag[]> = {
  bomb: [],
  sharknado: [],
  headsup: [],
  spellingblitz: ["xp"],
  spellingguesser: ["xp"],
  soundmatcher: ["xp"],
  bingo: [],
  memory: ["new"],
};
const hasGameTag = (k: GameKey, t: GameTag) => (GAME_TAGS[k] || []).includes(t);
const isGameNew = (k: GameKey) => hasGameTag(k, "new");
const isGameXp = (k: GameKey) => hasGameTag(k, "xp");

/** =========================
 *  Route + store
 *  ========================= */
import backIcon from "@/assets/images/icons/back-icon.png";
const route = useRoute();
const router = useRouter();
const sel = useSelectionsStore();
const gameTransit = useGameTransitStore() as ReturnType<typeof useGameTransitStore>;

const deckId = ref<string>("");
const deckKey = ref<string>("");
const isCustomDeck = ref<boolean>(false);

function resolveFromRoute() {
  const p = route.params as Record<string, any>;
  const q = route.query as Record<string, any>;
  const id = (p.id ?? p.deckId ?? q.id) as string | undefined;
  deckId.value = typeof id === "string" ? id : "";
  deckKey.value = deckId.value || "unknown-deck";
  isCustomDeck.value = String(q.kind || "").toLowerCase() === "custom";
}
resolveFromRoute();

/** =========================
 *  UI state
 *  ========================= */
const title = ref<string>("");
const cards = ref<Card[]>([]);
const error = ref<string | null>(null);

/** Selected card IDs */
const selected = ref<Set<string>>(new Set());
const selectedVersion = ref(0);

/** Popups */
const showReviewMenu = ref(false);
const showGameMenu = ref(false);

/** Add to custom deck popup */
const showAddMenu = ref(false);
const myDecks = ref<CustomDeckLite[]>([]);
const chosenDeckId = ref<string>("");
const creatingNew = ref<boolean>(false);
const newDeckTitle = ref<string>("");
const addBusy = ref<boolean>(false);
const addError = ref<string | null>(null);

/** Load modal and saved selections */
const showLoadModal = ref(false);
/** Only show names in the menu; coerce objects -> name */
const savedSets = computed(() => {
  const raw = sel.list(deckKey.value) || [];
  return raw
    .map((s: any) => (typeof s === "string" ? s : (s?.name ?? "")))
    .filter((n: string) => !!n);
});

/** Derived counts */
const cardCount = computed(() => cards.value.length);
const allSelected = computed(
  () => cards.value.length > 0 && selected.value.size === cards.value.length
);

/** Responsive column count */
const perRow = ref<number>(2);
function computePerRow() {
  const w = window.innerWidth;
  if (w >= 1500) return 6;
  if (w >= 1280) return 5;
  if (w >= 1024) return 4;
  if (w >= 760) return 3;
  return 2;
}
function onResize() {
  const next = computePerRow();
  if (next !== perRow.value) perRow.value = next;
}

/** Group cards into rows for virtualization */
const cardRows = computed<CardRow[]>(() => {
  const cols = perRow.value || 2;
  const arr = cards.value;
  const out: CardRow[] = [];
  for (let i = 0, k = 0; i < arr.length; i += cols, k++) {
    out.push({ key: k, items: arr.slice(i, i + cols) });
  }
  return out;
});

/** =========================
 *  Lifecycle
 *  ========================= */
onMounted(async () => {
  preloadGameIcons();

  perRow.value = computePerRow();
  window.addEventListener("resize", onResize, { passive: true });

  await withLoading(async () => {
    await loadDeck();
  }, 150);

  document.addEventListener("click", onDocClick);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
  document.removeEventListener("click", onDocClick);
});

watch(
  () => route.fullPath,
  async () => {
    resolveFromRoute();
    await withLoading(async () => {
      await loadDeck();
    }, 150);
  }
);

/** =========================
 *  Data loading
 *  ========================= */
function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t).toLowerCase());
  if (typeof raw === "string") {
    return raw
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  if (raw && typeof raw === "object") {
    try {
      const arr = Array.from(raw as any);
      return arr.map((t: any) => String(t).toLowerCase());
    } catch { }
  }
  return [];
}

async function loadDeck() {
  error.value = null;
  selected.value.clear();
  selectedVersion.value++;

  if (!deckId.value) {
    error.value = "Missing deck id in route.";
    throw new Error(error.value);
  }

  try {
    if (isCustomDeck.value) {
      // Title
      const { data: cDeck, error: cdErr } = await supabase
        .from("custom_decks")
        .select("id, title")
        .eq("id", deckId.value)
        .single();
      if (cdErr) throw cdErr;
      title.value = cDeck?.title || deckId.value;

      // Cards from custom view
      const { data: rows, error: rowsErr } = await supabase
        .from("v_custom_deck_cards_expanded")
        .select("card_id, position, english, japanese_kanji, japanese_furigana, image_url")
        .eq("deck_id", deckId.value)
        .order("position", { ascending: true });
      if (rowsErr) throw rowsErr;

      const mapped = (rows ?? []).map((r: any) => ({
        id: r.card_id,
        english: r.english ?? "",
        japanese: {
          kanji: r.japanese_kanji ?? undefined,
          furigana: r.japanese_furigana ?? undefined,
        },
        image_url: toPublicUrl(r.image_url),
        is_bonus: false,
      })) as Card[];

      cards.value = mapped;
      mapped.forEach((c) => selected.value.add(c.id));
      selectedVersion.value++;
      return;
    }

    // Standard deck path
    const { data: dById, error: eById } = await supabase
      .from("decks")
      .select("id, title, slug")
      .eq("id", deckId.value)
      .single();
    if (eById) throw eById;
    title.value = dById?.title || dById?.slug || deckId.value;

    const { data: rows, error: eRows } = await supabase
      .from("v_deck_cards_expanded")
      .select(`
        deck_id,
        card_id,
        position,
        english,
        japanese_kanji,
        japanese_furigana,
        image_url,
        audio_url,
        tags,
        card_tags
      `)
      .eq("deck_id", deckId.value)
      .order("position", { ascending: true });
    if (eRows) throw eRows;

    const mapped = (rows || []).map((r: any) => {
      const rawTags = r.tags ?? r.card_tags ?? null;
      const tags = normalizeTags(rawTags);
      const isBonus = tags.includes("bonus");
      return {
        id: r.card_id,
        english: r.english ?? "",
        japanese: {
          kanji: r.japanese_kanji ?? undefined,
          furigana: r.japanese_furigana ?? undefined,
        },
        image_url: toPublicUrl(r.image_url),
        is_bonus: isBonus,
      } as Card;
    });

    cards.value = mapped;
    mapped.forEach((c) => selected.value.add(c.id));
    selectedVersion.value++;
  } catch (e: any) {
    console.error(e);
    error.value = e?.message ?? "Failed to load deck.";
  }
}

/** =========================
 *  Back + Popups
 *  ========================= */
const goBack = () => router.back();

function openReviewMenu() { showReviewMenu.value = true; }
function closeReviewMenu() { showReviewMenu.value = false; }
function openGameMenu() { showGameMenu.value = true; }
function closeGameMenu() { showGameMenu.value = false; }

/** Add-to-custom menu controls */
async function openAddMenu() {
  addError.value = null;
  creatingNew.value = false;
  newDeckTitle.value = "";
  chosenDeckId.value = "";
  showAddMenu.value = true;

  const { data, error } = await supabase
    .from("custom_decks")
    .select("id, title, card_count")
    .order("updated_at", { ascending: false });
  if (error) {
    addError.value = error.message;
    return;
  }
  myDecks.value = (data ?? []) as CustomDeckLite[];
}
function closeAddMenu() {
  showAddMenu.value = false;
}

/** Close popups when clicking outside */
function onDocClick(e: MouseEvent) {
  const t = e.target as HTMLElement;
  if (showReviewMenu.value && !t.closest("#review-menu") && !t.closest("[data-open-review]")) closeReviewMenu();
  if (showGameMenu.value && !t.closest("#game-menu") && !t.closest("[data-open-game]")) closeGameMenu();
  if (showAddMenu.value && !t.closest("#add-menu") && !t.closest("[data-open-add]")) closeAddMenu();
  if (showLoadModal.value && !t.closest("#load-modal") && !t.closest("#load-selection-btn")) showLoadModal.value = false;
}

/** =========================
 *  Actions
 *  ========================= */
function selectMode(mode: "review" | "random" | "japanese") {
  closeReviewMenu();
  const currentDeckId = deckId.value;
  if (!currentDeckId) return;

  const ids = Array.from(selected.value);
  const query: Record<string, string> = {};
  if (ids.length) query.ids = ids.join(",");

  if (mode === "review") {
    query.mode = "review";
    router.push({ name: "FlashcardReview", params: { id: currentDeckId }, query });
  } else if (mode === "random") {
    query.mode = "random";
    router.push({ name: "FlashcardReview", params: { id: currentDeckId }, query });
  } else if (mode === "japanese") {
    router.push({ name: "JapaneseFlashcardReview", params: { id: currentDeckId }, query });
  }
}

/** Start games */
async function startGame(
  kind: "bomb" | "sharknado" | "headsup" | "spellingblitz" | "spellingguesser" | "soundmatcher" | "bingo" | "memory"
) {
  closeGameMenu();

  const currentDeckId = deckId.value;
  if (!currentDeckId) return;

  const common = async () => {
    const payload = buildSelectedCardsForGame();
    if (!payload.length) {
      alert("Select at least one card to play.");
      return null;
    }
    try {
      await preloadImages(payload.map((c) => c.image_url), { concurrency: 8, timeoutMs: 250 });
    } catch { }
    return payload;
  };

  if (kind === "bomb") {
    const payload = await common(); if (!payload) return;
    gameTransit.set({ cards: payload, mode: "bomb" });
    sessionStorage.setItem("eitake.bombgame.transit.v1", JSON.stringify({ cards: payload, mode: "bomb" }));
    router.push({ name: "bomb-game", params: { id: currentDeckId } });

  } else if (kind === "sharknado") {
    const payload = await common(); if (!payload) return;
    gameTransit.set({ cards: payload, mode: "sharknado" });
    sessionStorage.setItem("eitake.sharknado.transit.v1", JSON.stringify({ cards: payload, mode: "sharknado" }));
    router.push({ name: "sharknado", params: { id: currentDeckId } });

  } else if (kind === "headsup") {
    const payload = await common(); if (!payload) return;
    gameTransit.set({ cards: payload, mode: "headsup" });
    sessionStorage.setItem("eitake.sharknado.transit.v1", JSON.stringify({ cards: payload, mode: "headsup" }));
    router.push({ name: "headsup", params: { id: currentDeckId } });

  } else if (kind === "spellingblitz") {
    const payload = await common(); if (!payload) return;
    gameTransit.set({ cards: payload, mode: "spellingblitz", startMode: "easy" });
    sessionStorage.setItem("eitake.spellingblitz.transit.v1", JSON.stringify({ cards: payload, startMode: "easy" }));
    router.push({ name: "spellingblitz", params: { id: currentDeckId }, query: { mode: "easy" } });

  } else if (kind === "spellingguesser") {
    const payload = await common(); if (!payload) return;
    gameTransit.set({ cards: payload, mode: "spellingguesser", deckName: title.value });
    sessionStorage.setItem("eitake.spellingguesser.transit.v1", JSON.stringify({ cards: payload, deckName: title.value }));
    router.push({ name: "spellingguesser", params: { id: currentDeckId }, query: { deckName: title.value } });

  } else if (kind === "soundmatcher") {
    const payload = await common(); if (!payload) return;
    (gameTransit as any).seedForListening?.({
      deckId: currentDeckId,
      deckName: title.value,
      cards: payload,
      startMode: "easy",
      audioLocale: "en-US",
      ttsRate: 1.0,
    }) ?? gameTransit.set({
      cards: payload,
      mode: "listening",
      startMode: "easy",
      deckName: title.value as string,
    });
    sessionStorage.setItem(
      "eitake.soundmatcher.transit.v1",
      JSON.stringify({ cards: payload, deckName: title.value, startMode: "easy", deckId: currentDeckId })
    );
    router.push({ name: "sound-matcher", params: { deckId: currentDeckId } });

  } else if (kind === "bingo") {
    const payload = buildSelectedCardsForGame();
    if (payload.length < 9) {
      alert("Select at least 9 cards to play Bingo (3×3).");
      return;
    }
    try { await preloadImages(payload.map((c) => c.image_url), { concurrency: 8, timeoutMs: 250 }); } catch { }
    gameTransit.set({ cards: payload, mode: "bingo", deckName: title.value });
    sessionStorage.setItem("eitake.bingo.transit.v1", JSON.stringify({ cards: payload, deckName: title.value }));
    router.push({ name: "bingo", params: { id: currentDeckId } });
  } else if (kind === "memory") {
    const payload = await common(); if (!payload) return;
    gameTransit.set({ cards: payload, mode: "memory" });
    sessionStorage.setItem("eitake.memory.transit.v1", JSON.stringify({ cards: payload, mode: "memory" }));
    router.push({ name: "memory", params: { id: currentDeckId } });

  }
}

/** =========================
 *  Helpers
 *  ========================= */
function imgSrc(c: Card) {
  return c.image_url || c.image || "";
}
function toggleCardById(cardId: string) {
  if (selected.value.has(cardId)) selected.value.delete(cardId);
  else selected.value.add(cardId);
  selectedVersion.value++;
}
function toggleAll() {
  if (allSelected.value) {
    selected.value.clear();
  } else {
    cards.value.forEach((c) => selected.value.add(c.id));
  }
  selectedVersion.value++;
}
function toggleBonusWords() {
  if (!cards.value.length || !selected.value.size) return;
  const bonusIds = new Set(cards.value.filter((c) => c.is_bonus).map((c) => c.id));
  selected.value.forEach((id) => {
    if (bonusIds.has(id)) selected.value.delete(id);
  });
  selectedVersion.value++;
}
function buildSelectedCardsForGame() {
  return cards.value
    .filter((c) => selected.value.has(c.id))
    .map((c) => ({
      id: c.id,
      english: c.english,
      image_url: imgSrc(c),
      japanese: c.japanese ?? null,
    }));
}
function preloadImages(
  urls: string[],
  { concurrency = 8, timeoutMs = 250 }: { concurrency?: number; timeoutMs?: number } = {}
) {
  const queue = [...urls.filter(Boolean)];
  let active = 0;
  let resolveAll: () => void;
  const done = new Promise<void>((res) => (resolveAll = res));

  const deadline = Date.now() + timeoutMs;
  function next() {
    if (!queue.length) {
      if (active === 0) resolveAll();
      return;
    }
    if (Date.now() > deadline) {
      if (active === 0) resolveAll();
      return;
    }
    while (active < concurrency && queue.length) {
      active++;
      const url = queue.shift()!;
      const img = new Image();
      img.onload = img.onerror = () => {
        active--;
        next();
      };
      img.decoding = "async";
      img.loading = "eager";
      img.referrerPolicy = "no-referrer";
      img.src = url;
    }
  }
  next();
  // @ts-ignore
  return done!;
}

/** =========================
 *  Save / Load via local store
 *  ========================= */
function saveSelection() {
  const ids = Array.from(selected.value);
  if (!ids.length) {
    alert("No cards selected to save.");
    return;
  }
  const defName = `Set (${new Date().toLocaleString()})`;
  const name = window.prompt("Name this selection:", defName);
  if (!name) return;
  try {
    sel.save(deckKey.value, name, ids);
    showLoadModal.value = true;
  } catch (e) {
    console.error(e);
    alert("Failed to save selection.");
  }
}
function loadSelectionNamed(name: string) {
  try {
    const ids: string[] = sel.load(deckKey.value, name) || [];
    selected.value.clear();
    ids.forEach((id) => selected.value.add(id));
    selectedVersion.value++;
    showLoadModal.value = false;
  } catch (e) {
    console.error(e);
    alert("Failed to load selection.");
  }
}
function deleteSelectionNamed(name: string) {
  try {
    sel.delete(deckKey.value, name);
  } catch (e) {
    console.error(e);
    alert("Failed to delete selection.");
  }
}

/** BG Overlay */
// Overlay should show if any menu is open
const anyMenuOpen = computed(
  () => showReviewMenu.value || showGameMenu.value || showAddMenu.value || showLoadModal.value
);

// Close all popups at once (overlay click)
function closeAllPopups() {
  showReviewMenu.value = false;
  showGameMenu.value = false;
  showAddMenu.value = false;
  showLoadModal.value = false;
}

/** =========================
 *  Add to Custom Deck (DB Ops)
 *  ========================= */
async function ensureDeckForAdd(): Promise<string> {
  if (!creatingNew.value) {
    if (!chosenDeckId.value) throw new Error("Choose a custom deck.");
    return chosenDeckId.value;
  }
  const t = newDeckTitle.value.trim();
  if (!t) throw new Error("Enter a title for the new custom deck.");

  const { data: userData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userData?.user?.id) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("custom_decks")
    .insert({ owner_user_id: userData.user.id, title: t, visibility: "private" })
    .select("id, title, card_count")
    .single();
  if (error) throw error;

  myDecks.value.unshift(data as CustomDeckLite);
  chosenDeckId.value = data!.id;
  creatingNew.value = false;
  newDeckTitle.value = "";
  return data!.id;
}

async function addSelectionToDeck() {
  addBusy.value = true;
  addError.value = null;
  try {
    const deck_id = await ensureDeckForAdd();

    const selectedIds = Array.from(selected.value);
    if (selectedIds.length === 0) throw new Error("Select at least one card to add.");

    // append after current max position
    const { data: posRows, error: posErr } = await supabase
      .from("custom_deck_cards")
      .select("position")
      .eq("deck_id", deck_id)
      .order("position", { ascending: false })
      .limit(1);
    if (posErr) throw posErr;

    let pos = (posRows?.[0]?.position ?? 0) || 0;
    const rows = selectedIds.map((flashcard_id) => {
      pos += 1000;
      return { deck_id, flashcard_id, position: pos };
    });

    const { error: insErr } = await supabase
      .from("custom_deck_cards")
      .upsert(rows, { onConflict: "deck_id,flashcard_id" });
    if (insErr) throw insErr;

    closeAddMenu();
    alert(`Added ${selectedIds.length} card(s) to your custom deck.`);
  } catch (e: any) {
    addError.value = e?.message ?? "Failed to add cards.";
  } finally {
    addBusy.value = false;
  }
}
</script>

<template>
  <section class="deck-page">
    <!-- Frosted overlay (click to close all popups) -->
    <div v-if="anyMenuOpen" class="frosted-overlay" role="presentation" aria-hidden="true" @click="closeAllPopups">
    </div>
    <!-- Relative top bar (back, title, add pill) -->
    <div class="page-topbar">
      <!-- Larger icon, no bg on hover -->
      <button class="icon-btn back-btn" type="button" @click="goBack" aria-label="Back" title="Back">
        <img class="icon" :src="backIcon" alt="" />
      </button>

      <h1 class="deck-title">{{ title || deckKey }}</h1>

      <button class="add-to-custom-btn" type="button" data-open-add @click="openAddMenu()"
        aria-label="Add to custom deck" title="Add to Custom Deck">
        <span class="icon">+</span>
        <span class="label">Add to Custom Deck</span>
      </button>
    </div>

    <div class="deck-header">
      <div class="deck-header-row">
        <button data-open-review type="button" @click="openReviewMenu()">Review Mode</button>
        <button data-open-game type="button" @click="openGameMenu()">Games</button>
      </div>
      <div class="deck-header-row">
        <button id="toggle-bonus-btn" type="button" @click="toggleBonusWords()">Deselect Bonus Words</button>
        <button id="toggle-all-btn" type="button" @click="toggleAll()">
          {{ allSelected ? "Deselect All" : "Select All" }}
        </button>
      </div>
      <div class="deck-header-row">
        <button type="button" @click="saveSelection()">Save Selection</button>
        <button id="load-selection-btn" type="button" @click="showLoadModal = true" :disabled="!savedSets.length">
          Load Selection
        </button>
      </div>
    </div>

    <!-- Review Menu -->
    <div id="review-menu" class="popup" v-if="showReviewMenu" role="dialog" aria-modal="true"
      :aria-hidden="!showReviewMenu">
      <h3>Select a Review Mode</h3>
      <button class="normal-review-btn" type="button" @click="selectMode('review')">Regular Order</button>
      <button class="random-btn" type="button" @click="selectMode('random')">Random Order</button>
      <button class="japanese-mode-btn" type="button" @click="selectMode('japanese')">Japanese Mode (Random)</button>
      <button class="cancel-btn" type="button" @click="closeReviewMenu()">Cancel</button>
    </div>

    <!-- Games Menu -->
    <div id="game-menu" class="game-popup" v-if="showGameMenu" role="dialog" aria-modal="true"
      :aria-hidden="!showGameMenu">
      <h3>Select a Game Mode</h3>
      <div class="button-container">
        <button class="game-btn bomb-game-btn" type="button" @click="startGame('bomb')">
          <div class="corner-rail">
            <div v-if="isGameNew('bomb')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('bomb')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Bomb Game</p>
          <img class="game-icon" :src="gameIcon('bomb')" alt="Bomb Game" loading="eager" decoding="async"
            fetchpriority="high" @error="onIconError" />
        </button>

        <button class="game-btn sharknado-game-btn" type="button" @click="startGame('sharknado')">
          <div class="corner-rail">
            <div v-if="isGameNew('sharknado')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('sharknado')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Sharknado!</p>
          <img class="game-icon" :src="gameIcon('sharknado')" alt="Sharknado" loading="eager" decoding="async"
            fetchpriority="high" @error="onIconError" />
        </button>

        <button class="game-btn headsup-game-btn" type="button" @click="startGame('headsup')">
          <div class="corner-rail">
            <div v-if="isGameNew('headsup')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('headsup')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Heads Up</p>
          <img class="game-icon" :src="gameIcon('headsup')" alt="Heads Up" loading="eager" decoding="async"
            fetchpriority="high" @error="onIconError" />
        </button>

        <button class="game-btn spelling-blitz-btn" type="button" @click="startGame('spellingblitz')">
          <div class="corner-rail">
            <div v-if="isGameNew('spellingblitz')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('spellingblitz')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Spelling Blitz</p>
          <img class="game-icon" :src="gameIcon('spellingblitz')" alt="Spelling Blitz" loading="eager" decoding="async"
            fetchpriority="high" @error="onIconError" />
        </button>

        <button class="game-btn spelling-guesser-btn" type="button" @click="startGame('spellingguesser')">
          <div class="corner-rail">
            <div v-if="isGameNew('spellingguesser')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('spellingguesser')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Spelling Guesser</p>
          <img class="game-icon" :src="gameIcon('spellingguesser')" alt="Spelling Guesser" loading="eager"
            decoding="async" fetchpriority="high" @error="onIconError" />
        </button>

        <button class="game-btn sound-matcher-btn" type="button" @click="startGame('soundmatcher')">
          <div class="corner-rail">
            <div v-if="isGameNew('soundmatcher')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('soundmatcher')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Sound Matcher</p>
          <img class="game-icon" :src="gameIcon('soundmatcher')" alt="Sound Matcher" loading="eager" decoding="async"
            fetchpriority="high" @error="onIconError" />
        </button>

        <button class="game-btn bingo-btn" type="button" @click="startGame('bingo')">
          <div class="corner-rail">
            <div v-if="isGameNew('bingo')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('bingo')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Bingo</p>
          <img class="game-icon" :src="gameIcon('bingo')" alt="Bingo" loading="eager" decoding="async"
            fetchpriority="high" @error="onIconError" />
        </button>

        <button class="game-btn memory-btn" type="button" @click="startGame('memory')">
          <div class="corner-rail">
            <div v-if="isGameNew('memory')" class="corner tl new"><span>NEW</span></div>
            <div v-if="isGameXp('memory')" class="corner tr xp"><span>XP</span></div>
          </div>
          <p class="game-popup-text">Memory Game</p>
          <img class="game-icon" :src="gameIcon('memory')" alt="Memory" loading="eager" decoding="async"
            fetchpriority="high" @error="onIconError" />
        </button>

      </div>
      <button class="cancel-btn" type="button" @click="closeGameMenu()">Cancel</button>
    </div>

    <!-- Add to Custom Deck Menu -->
    <div id="add-menu" class="popup add-popup" v-if="showAddMenu" role="dialog" aria-modal="true"
      :aria-hidden="!showAddMenu">
      <h3 style="margin-top:0">Add to Custom Deck</h3>

      <div class="add-section">
        <label class="radio">
          <input type="radio" name="add-target" :checked="!creatingNew" @change="creatingNew = false" />
          <span>Select existing deck</span>
        </label>

        <select class="deck-select" :disabled="creatingNew" v-model="chosenDeckId">
          <option value="" disabled>Select a deck…</option>
          <option v-for="d in myDecks" :key="d.id" :value="d.id">
            {{ d.title }} ({{ d.card_count }})
          </option>
        </select>
      </div>

      <div class="add-section">
        <label class="radio">
          <input type="radio" name="add-target" :checked="creatingNew" @change="creatingNew = true" />
          <span>Create a new custom deck</span>
        </label>

        <input class="deck-input" type="text" :disabled="!creatingNew" v-model.trim="newDeckTitle" maxlength="120"
          placeholder="New deck title" />
      </div>

      <p v-if="addError" class="error" role="alert">{{ addError }}</p>

      <div class="add-actions">
        <button class="cancel-btn" type="button" @click="closeAddMenu()" :disabled="addBusy">Cancel</button>
        <button class="confirm-btn" type="button" @click="addSelectionToDeck()" :disabled="addBusy">
          {{ addBusy ? 'Adding…' : 'Add' }}
        </button>
      </div>

      <p class="muted small" style="margin-top:8px;">
        {{ selected.size }} card(s) selected
      </p>
    </div>

    <!-- Load Selection Modal (names only) -->
    <div id="load-modal" class="popup add-popup" v-if="showLoadModal" role="dialog" aria-modal="true">
      <h3 style="margin-top:0">Load a Saved Selection</h3>

      <div class="saved-list" v-if="savedSets.length">
        <div class="saved-row" v-for="name in savedSets" :key="name">
          <div class="saved-name">{{ name }}</div>
          <div class="saved-actions">
            <button type="button" @click="loadSelectionNamed(name)">Load</button>
            <button type="button" class="danger" @click="deleteSelectionNamed(name)">Delete</button>
          </div>
        </div>
      </div>
      <p v-else class="muted">No saved selections yet.</p>

      <div class="add-actions">
        <button class="cancel-btn" type="button" @click="showLoadModal = false">Close</button>
      </div>
    </div>

    <h2 class="count-line">Cards in this Deck: <span id="card-count">{{ cardCount }}</span></h2>

    <!-- Virtualized grid: one row per scroller item -->
    <RecycleScroller class="deck-scroller" :items="cardRows" :item-size="ROW_HEIGHT" key-field="key" v-slot="{ item }">
      <div class="row-grid" :style="{ gridTemplateColumns: `repeat(${perRow}, 1fr)` }">
        <div v-for="c in item.items" :key="c.id" v-memo="[selectedVersion, selected.has(c.id)]" class="deck-card"
          :class="{ selected: selected.has(c.id) }" @click="toggleCardById(c.id)">
          <div class="card-content">
            <img :src="imgSrc(c)" :alt="c.english" class="deck-card-img" loading="lazy" decoding="async"
              referrerpolicy="no-referrer" draggable="false" />
            <div class="card-text">
              <p class="furigana" v-if="c.japanese?.furigana">
                {{ c.japanese.furigana }}
              </p>
              <p class="kanji" v-if="c.japanese?.kanji">
                {{ c.japanese.kanji }}
              </p>
              <p class="english">{{ c.english }}</p>
            </div>
          </div>
        </div>
      </div>
    </RecycleScroller>


    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<style scoped>
/* =========================
   DeckViewer.vue — token-only styling (updated)
   ========================= */
.deck-page {
  font-family: "Fredoka", system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans",
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif;
  min-height: 100%;
  box-sizing: border-box;
  text-align: center;
  padding: 20px 20px 120px;
  overflow-x: visible;
}

/* ---------- Top bar ---------- */
.page-topbar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.deck-title {
  color: var(--main-title-color);
  font-size: 32px;
  margin: 0;
  justify-self: center;
  text-shadow: var(--deckviewer-title-shadow);
}

/* Back icon button */
.icon-btn {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  line-height: 0;
  transition: transform 0.14s ease;
}

.icon-btn .icon {
  width: 36px;
  height: 36px;
  display: block;
}

.icon-btn:hover {
  transform: scale(1.08);
  background-color: transparent;
}

.icon-btn:active {
  transform: scale(0.95);
  background-color: transparent;
}

.back-btn {
  justify-self: start;
}

/* Base button */
button {
  background-color: var(--deckviewer-btn-primary-bg);
  color: var(--deckviewer-btn-primary-on);
  font-size: 18px;
  padding: 12px 20px;
  border: 1px solid var(--deckviewer-button-outline);
  border-radius: 8px;
  cursor: pointer;
  transition: 0.12s;
  will-change: transform;
}

button:hover {
  background-color: var(--deckviewer-btn-primary-bg-hover);
  color: var(--deckviewer-btn-primary-on-hover);
  transform: translateZ(0) scale(1.01);
}

button:disabled {
  background-color: var(--deckviewer-btn-disabled-bg);
  color: var(--deckviewer-btn-disabled-on);
  cursor: not-allowed;
  pointer-events: none;
  opacity: 0.7;
  border: 2px solid var(--deckviewer-button-outline);
}

button:disabled:hover {
  background-color: var(--deckviewer-btn-disabled-bg);
}

/* ---------- Add-to-Custom expanding pill ---------- */
.add-to-custom-btn {
  justify-self: end;
  align-items: center;
  gap: 10px;
  height: 44px;
  min-width: 44px;
  max-width: 44px;
  /* collapsed width: just '+' */
  padding: 0 12px;
  border-radius: 999px;
  background: var(--deckviewer-add-btn-bg);
  color: var(--deckviewer-btn-primary-on);
  border: 1px solid var(--deckviewer-button-outline);
  box-shadow: var(--elevation-2);
  cursor: pointer;
  overflow: hidden;
  transition: max-width 160ms ease, transform 120ms ease;
}

.add-to-custom-btn .icon {
  font-weight: 1000;
  font-size: 22px;
  line-height: 1;
}

.add-to-custom-btn .label {
  font-weight: 800;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(8px);
  transition: opacity 140ms ease, transform 140ms ease;
}

.add-to-custom-btn:hover,
.add-to-custom-btn:focus-visible,
.add-to-custom-btn:active {
  background: var(--deckviewer-add-btn-bg) !important;
  border-color: var(--deckviewer-button-outline) !important;
  transform: translateZ(0) scale(1.01);
}

.add-to-custom-btn:hover .label,
.add-to-custom-btn:focus-visible .label {
  opacity: 1;
  transform: translateX(0);
}

.add-to-custom-btn:hover,
.add-to-custom-btn:focus-visible {
  max-width: 260px;
}

/* Header blocks below the topbar */
.count-line {
  margin: 14px 0 6px;
  color: var(--main-text-color);
}

/* Deck header layout */
.deck-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.deck-header-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Virtualized grid row */
.row-grid {
  width: min(1280px, 86vw);
  margin: 0 auto;
  padding: 20px 28px;
  /* extra side padding for shadows */
  display: grid;
  column-gap: 18px;
  overflow: visible;
}

/* Vertical spacing between rows */
:deep(.vue-recycle-scroller__item-wrapper) {
  padding-bottom: 26px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: visible;
}

/* Cards — colorful border from token; English text matches border color */
.deck-card {
  background: var(--flashcards-surface);
  padding: 12px;
  border-radius: 12px;
  border: 4px solid var(--flashcards-border);
  /* colorful */
  box-shadow:
    0 6px 14px rgba(0, 0, 0, 0.25),
    0 2px 0 rgba(0, 0, 0, 0.12);
  text-align: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  cursor: pointer;
  opacity: 0.6;
  contain: content;
}

.deck-card.selected {
  background-color: color-mix(in srgb, var(--flashcards-surface) 85%, var(--neutral-0) 15%);
  opacity: 1;
}

.deck-card:hover {
  transform: translateZ(0) scale(1.02);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.28),
    0 3px 0 rgba(0, 0, 0, 0.12);
}

.deck-card-img {
  max-width: 84px;
  max-height: 84px;
  height: auto;
  margin-bottom: 8px;
}

.card-text p {
  margin: 4px 0;
  font-size: 15px;
  font-weight: 800;
}

.kanji {
  font-size: 17px;
  color: var(--flashcards-on-surface);
}

.furigana {
  font-size: 13px;
  color: color-mix(in srgb, var(--flashcards-on-surface) 60%, #ffffff 40%);
}

.english {
  font-size: 15px;
  color: var(--flashcards-english);
}

/* Popups (base) — use modal tokens */
.popup,
.game-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  padding: 20px;
  gap: 10px;
  border-radius: 8px;
  border: 1px solid var(--modal-border);
  box-shadow: var(--modal-shadow);
  text-align: center;
  z-index: 1000;
}

/* Review popup spacing */
#review-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

#review-menu h3 {
  margin: 0 0 4px;
}

/* --- Games popup: flexible size + scrolling content --- */
.game-popup {
  width: min(92vw, 1040px);
  max-height: min(86vh, 900px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.game-popup>h3 {
  margin: 0;
}

/* --- Games grid --- */
.game-popup .button-container {
  flex: 1 1 auto;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  justify-items: stretch;
  align-items: stretch;
  padding: 4px;
}

/* --- Game buttons --- */
.game-popup .button-container>button {
  width: 100%;
  aspect-ratio: 5 / 4;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  border: 2px solid var(--deckviewer-button-outline);
  box-shadow: var(--elevation-1);
  will-change: transform;
  color: var(--deckviewer-btn-primary-on);
  font-weight: 1000;
  /* bold */
}

.game-popup-text {
  text-shadow:
    0 1px 0 rgba(0, 0, 0, .35),
    0 -1px 0 rgba(0, 0, 0, .35),
    1px 0 0 rgba(0, 0, 0, .35),
    -1px 0 0 rgba(0, 0, 0, .35);
}

.game-popup .button-container>button:hover {
  transform: translateY(-1px) scale(1.01);
}

/* Icons scale within the tile */
.game-popup .game-icon {
  width: clamp(56px, 10vw, 80px);
  height: clamp(56px, 10vw, 80px);
  object-fit: contain;
  pointer-events: none;
}

/* Keep cancel button visible under the grid */
.cancel-btn {
  align-self: center;
  margin-top: 4px;
  background: var(--btn-danger-bg);
  color: var(--deckviewer-btn-primary-on);
  border: 1px solid var(--deckviewer-button-outline);
}

.cancel-btn:hover {
  background: color-mix(in srgb, var(--btn-danger-bg) 75%, var(--neutral-0) 25%);
  /* lighter red */
}

/* Per-game backgrounds (text remains dark via rule above) */
.bomb-game-btn {
  background: var(--accent-danger);
}

.bomb-game-btn:hover {
  background: color-mix(in srgb, var(--accent-danger) 85%, var(--neutral-0) 15%);
}

.sharknado-game-btn {
  background: var(--accent-secondary);
}

.sharknado-game-btn:hover {
  background: color-mix(in srgb, var(--accent-secondary) 88%, var(--neutral-0) 12%);
}

.headsup-game-btn {
  background: var(--accent-warning);
}

.headsup-game-btn:hover {
  background: color-mix(in srgb, var(--accent-warning) 88%, var(--neutral-0) 12%);
}

.spelling-blitz-btn {
  background: var(--accent-primary);
}

.spelling-blitz-btn:hover {
  background: color-mix(in srgb, var(--accent-primary) 88%, var(--neutral-0) 12%);
}

.spelling-guesser-btn {
  background: var(--accent-lavender, #a78bfa);
}

.spelling-guesser-btn:hover {
  background: color-mix(in srgb, var(--accent-lavender, #a78bfa) 88%, var(--neutral-0) 12%);
}

.sound-matcher-btn {
  background: var(--accent-success);
}

.sound-matcher-btn:hover {
  background: color-mix(in srgb, var(--accent-success) 88%, var(--neutral-0) 12%);
}

.bingo-btn {
  background: var(--accent-pink, #ef66a6);
}

.bingo-btn:hover {
  background: color-mix(in srgb, var(--accent-pink, #ef66a6) 88%, var(--neutral-0) 12%);
}

/* Load modal extras */
.saved-list {
  display: grid;
  gap: 8px;
  margin: 10px 0;
}

.saved-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--modal-border);
  border-radius: 8px;
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  box-shadow: var(--elevation-1);
}

.saved-name {
  font-weight: 800;
}

.saved-actions button {
  margin-left: 8px;
}

.saved-actions .danger {
  background: var(--btn-danger-bg);
  color: var(--btn-danger-on);
  border-color: var(--btn-danger-border);
}

.saved-actions .danger:hover {
  filter: brightness(0.98);
}

/* Add-to-custom popup styles */
.add-popup {
  width: min(520px, 96vw);
}

.add-section {
  display: grid;
  gap: 8px;
  margin: 8px 0 10px;
  text-align: left;
}

.radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--modal-on-surface);
}

.deck-select,
.deck-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--modal-border);
  background: var(--modal-surface);
  color: var(--modal-on-surface);
  font-size: 16px;
}

.add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
}

.confirm-btn {
  background: var(--accent-secondary);
  color: var(--deckviewer-btn-primary-on);
  /* darker text */
  border: 2px solid var(--deckviewer-button-outline);
}

.confirm-btn:hover {
  background: color-mix(in srgb, var(--accent-secondary) 60%, var(--neutral-0) 4%);
}

/* --- Game button corner badges (pills) --- */
.game-btn {
  position: relative;
  overflow: visible;
}

.corner-rail {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}

.game-popup {
  --badge-inset: 10px;
  --badge-height: 1.4rem;
  --badge-pad-x: 0.9rem;
  --badge-radius: 999px;
  --badge-font: 0.8rem;
}

.corner {
  position: absolute;
  top: var(--badge-inset);
  pointer-events: none;
}

.corner.tl {
  left: var(--badge-inset);
}

.corner.tr {
  right: var(--badge-inset);
}

.corner span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: var(--badge-height);
  padding: 0 var(--badge-pad-x);
  border-radius: var(--badge-radius);
  font-weight: 1000;
  font-size: var(--badge-font);
  letter-spacing: 0.07em;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid var(--modal-border);
  box-shadow: var(--elevation-2);
  color: var(--neutral-950);
}

.corner.new span {
  background: color-mix(in srgb, var(--accent-success) 35%, var(--neutral-0) 65%);
  border-color: color-mix(in srgb, var(--accent-success) 35%, var(--modal-border) 65%);
}

.corner.xp span {
  background: var(--accent-lavender, #a78bfa);
  border-color: color-mix(in srgb, var(--accent-lavender, #a78bfa) 45%, var(--modal-border) 55%);
}

/** Frosted BG **/
.frosted-overlay {
  position: fixed;
  inset: 0;
  z-index: 950;
  /* below .popup/.game-popup (which are 1000), above page content */
  background: var(--modal-overlay-bg);
  backdrop-filter: var(--modal-overlay-filter);
  -webkit-backdrop-filter: var(--modal-overlay-filter);
  /* Optional soft fade-in */
  animation: overlay-fade 120ms ease-out both;
}

@keyframes overlay-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* --- Responsive tweaks --- */
@media (max-width: 900px) {
  .game-popup {
    width: min(96vw, 880px);
  }

  .game-popup .button-container {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 600px) {
  button {
    font-size: 16px;
    padding: 10px 16px;
  }

  .game-popup {
    width: 96vw;
    max-height: 88vh;
    padding: 16px;
  }

  .game-popup .button-container {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }

  .game-popup .button-container>button {
    aspect-ratio: auto;
    min-height: 140px;
  }
}
</style>
