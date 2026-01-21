<!-- src/components/DailyWord.vue -->
<template>
  <section class="dw-root" aria-label="Daily Word">
    <header class="dw-top">
      <div class="dw-date">{{ headerDate }}</div>
    </header>

    <div v-if="loading" class="dw-body">
      <div class="dw-skel dw-skel-word"></div>
      <div class="dw-skel dw-skel-pos"></div>
      <div class="dw-skel dw-skel-def"></div>
      <div class="dw-skel dw-skel-def"></div>
    </div>

    <div v-else-if="error" class="dw-body">
      <div class="dw-word">{{ display.term }}</div>

      <div v-if="display.pos" class="dw-pos">
        {{ display.pos }}
      </div>

      <div class="dw-def">
        {{ display.definition }}
      </div>

      <div v-if="display.example" class="dw-divider" aria-hidden="true"></div>

      <div v-if="display.example" class="dw-ex">
        {{ display.example }}
      </div>

      <div class="dw-error-msg">
        {{ error }}
      </div>

      <footer class="dw-foot">
        <div class="dw-source">
          Source: {{ display.provider }}
        </div>

        <button
          class="dw-lang-btn"
          type="button"
          :aria-pressed="showJapanese"
          @click="toggleLang"
        >
          {{ showJapanese ? "EN" : "日本語" }}
        </button>
      </footer>
    </div>

    <div v-else class="dw-body">
      <div class="dw-word">{{ display.term }}</div>

      <div v-if="display.pos" class="dw-pos">
        {{ display.pos }}
      </div>

      <div class="dw-def">
        {{ display.definition }}
      </div>

      <div v-if="display.example" class="dw-divider" aria-hidden="true"></div>

      <div v-if="display.example" class="dw-ex">
        {{ display.example }}
      </div>

      <footer class="dw-foot">
        <div class="dw-source">
          Source: {{ display.provider }}
        </div>

        <button
          class="dw-lang-btn"
          type="button"
          :aria-pressed="showJapanese"
          @click="toggleLang"
        >
          {{ showJapanese ? "EN" : "日本語" }}
        </button>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "@/lib/supabase";

type DailyWordRow = {
  id: string;
  term: string;
  pos: string;
  definition_en: string;
  definition_ja: string | null;
  example_en: string | null;
  example_jp: string | null;
  created_at: string;
  updated_at: string;
};

type DailyWordScheduleRow = {
  date: string; // YYYY-MM-DD
  entry_id: string;
  term_snapshot: string;
  created_at?: string;
  updated_at?: string;
};

const FALLBACK = {
  provider: "EiTake",
  date: null as string | null,
  term: "Broken",
  pos: "phrase",
  definition_en: "This website is broken, and the dev should fix it soon.",
  definition_ja: "このサイトは不具合があります。開発者が早めに直す必要があります。",
  example_en: "The daily word could not be loaded today.",
  example_jp: "今日はデイリーワードを読み込めませんでした。",
};

const loading = ref(true);
const error = ref<string | null>(null);
const showJapanese = ref(false);

const data = ref<{
  provider: string;
  date: string | null;
  term: string;
  pos: string | null;
  definition_en: string | null;
  definition_ja: string | null;
  example_en: string | null;
  example_jp: string | null;
} | null>(null);

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function todayInTokyoISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function toggleLang() {
  showJapanese.value = !showJapanese.value;
}

const display = computed(() => {
  const p = data.value;

  const def =
    showJapanese.value
      ? (p?.definition_ja || p?.definition_en || FALLBACK.definition_en)
      : (p?.definition_en || FALLBACK.definition_en);

  const ex =
    showJapanese.value
      ? (p?.example_jp || p?.example_en || FALLBACK.example_en)
      : (p?.example_en || FALLBACK.example_en);

  if (p) {
    return {
      provider: p.provider || "EiTake",
      date: p.date,
      term: p.term || FALLBACK.term,
      pos: p.pos || null,
      definition: def ? normalizeText(def) : FALLBACK.definition_en,
      example: ex ? normalizeText(ex) : null,
    };
  }

  return {
    provider: FALLBACK.provider,
    date: FALLBACK.date,
    term: FALLBACK.term,
    pos: FALLBACK.pos,
    definition: showJapanese.value ? FALLBACK.definition_ja : FALLBACK.definition_en,
    example: showJapanese.value ? FALLBACK.example_jp : FALLBACK.example_en,
  };
});

const headerDate = computed(() => {
  if (display.value.date) return formatDate(display.value.date);
  return "—";
});

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const today = todayInTokyoISO();

    // 1) Get schedule for today
    const { data: sched, error: schedErr } = await supabase
      .from("daily_word_schedule")
      .select("date, entry_id, term_snapshot")
      .eq("date", today)
      .maybeSingle();

    if (schedErr) throw schedErr;
    if (!sched) throw new Error(`No daily word scheduled for ${today}.`);

    const scheduleRow = sched as DailyWordScheduleRow;

    // 2) Get entry by ID
    const { data: word, error: wordErr } = await supabase
      .from("daily_words")
      .select("id, term, pos, definition_en, definition_ja, example_en, example_jp, created_at, updated_at")
      .eq("id", scheduleRow.entry_id)
      .maybeSingle();

    if (wordErr) throw wordErr;
    if (!word) throw new Error(`Scheduled entry not found (id=${scheduleRow.entry_id}).`);

    const w = word as DailyWordRow;

    data.value = {
      provider: "EiTake",
      date: scheduleRow.date,
      term: w.term || scheduleRow.term_snapshot || FALLBACK.term,
      pos: w.pos ?? null,
      definition_en: w.definition_en ?? null,
      definition_ja: w.definition_ja ?? null,
      example_en: w.example_en ?? null,
      example_jp: w.example_jp ?? null,
    };
  } catch (e: any) {
    const msg =
      e?.message ||
      e?.details ||
      (typeof e === "string" ? e : "Unknown error");
    error.value = msg;
    data.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.dw-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;

  background: transparent;
  border: 0;
  border-radius: 0;

  color: var(--table-on-surface);

  container-type: inline-size;
  min-width: 0;
}

.dw-top {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 0 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--table-border) 70%, transparent);
}

.dw-date {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--table-muted);
}

.dw-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  min-width: 0;
  overflow: hidden;
}

.dw-word {
  font-weight: 850;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--table-on-surface);

  width: 100%;
  max-width: 100%;
  min-width: 0;

  white-space: nowrap;
  overflow: visible;

  font-size: clamp(18px, 10cqw, 34px);

  word-break: normal;
  overflow-wrap: normal;
  hyphens: manual;
}

@supports not (width: 1cqw) {
  .dw-word {
    font-size: clamp(18px, 6.5vw, 34px);
  }
}

@container (max-width: 320px) {
  .dw-word {
    white-space: normal;
    font-size: clamp(16px, 9cqw, 30px);

    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: visible;
  }
}

@container (max-width: 240px) {
  .dw-word {
    overflow-wrap: anywhere;
    word-break: break-word;
    font-size: clamp(14px, 10cqw, 26px);
  }
}

.dw-pos {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--accent-primary) 70%, var(--table-on-surface) 30%);
}

.dw-def {
  font-size: 14px;
  line-height: 1.38;
  color: color-mix(in srgb, var(--table-on-surface) 88%, var(--table-muted) 12%);

  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 5;
  -webkit-line-clamp: 5;
  overflow: hidden;
}

.dw-divider {
  height: 1px;
  width: 100%;
  margin: 2px 0;
  background: color-mix(in srgb, var(--table-border) 70%, transparent);
}

.dw-ex {
  font-size: 14px;
  line-height: 1.38;
  color: color-mix(in srgb, var(--table-on-surface) 82%, var(--table-muted) 18%);

  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 4;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.dw-foot {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--table-border) 70%, transparent);

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dw-source {
  font-size: 11px;
  color: var(--table-muted);
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dw-lang-btn {
  margin-left: auto;
  flex: 0 0 auto;

  border: 1px solid color-mix(in srgb, var(--table-border) 70%, transparent);
  background: color-mix(in srgb, var(--table-on-surface) 6%, transparent);
  color: var(--table-on-surface);

  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;

  padding: 6px 10px;
  border-radius: 10px;

  cursor: pointer;
  user-select: none;
}

.dw-lang-btn:hover {
  background: color-mix(in srgb, var(--table-on-surface) 10%, transparent);
}

.dw-lang-btn:active {
  transform: translateY(1px);
}

.dw-lang-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent-primary) 55%, transparent);
  outline-offset: 2px;
}

.dw-error-msg {
  margin-top: 6px;
  font-size: 12px;
  color: color-mix(in srgb, var(--accent-danger) 70%, var(--table-on-surface) 30%);
}

.dw-skel {
  border-radius: 10px;
  background: color-mix(in srgb, var(--table-on-surface) 10%, transparent);
  position: relative;
  overflow: hidden;
}
.dw-skel::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-60%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--table-on-surface) 10%, transparent),
    transparent
  );
  animation: dwShimmer 1.4s infinite;
}
.dw-skel-word { height: 38px; width: 72%; }
.dw-skel-pos { height: 14px; width: 34%; }
.dw-skel-def { height: 12px; width: 100%; }

@keyframes dwShimmer {
  0% { transform: translateX(-60%); }
  100% { transform: translateX(60%); }
}
</style>
