<!-- src/components/DailyWord.vue -->
<template>
  <section class="dw-root" aria-label="Daily Word">
    <!-- Date at very top -->
    <header class="dw-top">
      <div class="dw-date">{{ headerDate }}</div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="dw-body">
      <div class="dw-skel dw-skel-word"></div>
      <div class="dw-skel dw-skel-pos"></div>
      <div class="dw-skel dw-skel-def"></div>
      <div class="dw-skel dw-skel-def"></div>
    </div>

    <!-- Error (still shows fallback word/definition, plus the error) -->
    <div v-else-if="error" class="dw-body">
      <div class="dw-word">{{ display.word }}</div>

      <div v-if="display.pos" class="dw-pos">
        {{ display.pos }}
      </div>

      <div class="dw-def">
        {{ display.definition }}
      </div>

      <div class="dw-error-msg">
        {{ error }}
      </div>

      <footer class="dw-foot">
        <div class="dw-source">
          Source: {{ display.provider }}
        </div>
      </footer>
    </div>

    <!-- Content -->
    <div v-else class="dw-body">
      <div class="dw-word">{{ display.word }}</div>

      <div v-if="display.pos" class="dw-pos">
        {{ display.pos }}
      </div>

      <div class="dw-def">
        {{ display.definition }}
      </div>

      <footer class="dw-foot">
        <div class="dw-source">
          Source: {{ display.provider }}
        </div>
      </footer>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { supabase } from "@/lib/supabase";

type DailyWordPayload = {
  provider: string;
  providerUrl: string;
  feedUrl: string;
  date: string | null;

  // RSS-derived
  word: string;
  titleRaw: string;
  summary: string | null;
  sourceUrl: string | null;

  // Scraped / parsed by Edge Function (may be null depending on page format)
  partOfSpeech: string | null;
  definition: string | null;
  example: string | null; // not used by UI; retained for compatibility
};

const FALLBACK = {
  provider: "Local fallback",
  date: null as string | null,
  word: "Broken",
  definition: "This website is broken, and the dev should fix it soon.",
  partOfSpeech: null as string | null,
};

const loading = ref(true);
const error = ref<string | null>(null);
const data = ref<DailyWordPayload | null>(null);

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ------------------------------ Fallback parsing ------------------------------ */

const POS_WORDS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "determiner",
  "article",
];

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function extractPartOfSpeech(text: string): string | null {
  const lower = text.toLowerCase();

  for (const p of POS_WORDS) {
    const re = new RegExp(`\\b${p}\\b\\s*[:–—-]`, "i");
    if (re.test(text)) return capitalize(p);
  }

  for (const p of POS_WORDS) {
    const re = new RegExp(`\\(\\s*${p}\\s*\\)`, "i");
    if (re.test(text)) return capitalize(p);
  }

  for (const p of POS_WORDS) {
    const re = new RegExp(`\\b${p}\\b`, "i");
    if (re.test(lower)) return capitalize(p);
  }

  return null;
}

function pickDefinition(text: string, partOfSpeech: string | null): string | null {
  let t = text;

  if (partOfSpeech) {
    const lower = partOfSpeech.toLowerCase();
    const idx = t.toLowerCase().search(new RegExp(`\\b${lower}\\b\\s*[:–—-]`));
    if (idx >= 0) {
      const after = t.slice(idx);
      const cut = after.replace(new RegExp(`^.*?\\b${lower}\\b\\s*[:–—-]\\s*`, "i"), "");
      t = cut || t;
    }
  }

  t = t.replace(/^\s*(definition|meaning)\s*[:–—-]\s*/i, "");
  const sentences = t
    .split(/(?<=[.!?])\s+/)
    .map((x) => normalizeText(x))
    .filter(Boolean);

  if (!sentences.length) return normalizeText(t) || null;

  for (const s of sentences) {
    if (s.length >= 12 && s.length <= 300) return s;
  }

  return sentences[0] || null;
}

/* ------------------------------ Display model ------------------------------ */

const display = computed(() => {
  const p = data.value;

  if (p) {
    const summary = p.summary ? normalizeText(p.summary) : "";

    const pos =
      p.partOfSpeech ??
      (summary ? extractPartOfSpeech(summary) : null) ??
      null;

    const definition =
      p.definition ??
      (summary ? pickDefinition(summary, pos) : null) ??
      null;

    return {
      provider: p.provider || "Wordsmith — A Word A Day",
      date: p.date,
      word: p.word || FALLBACK.word,
      pos,
      definition: definition || FALLBACK.definition,
    };
  }

  return {
    provider: FALLBACK.provider,
    date: FALLBACK.date,
    word: FALLBACK.word,
    pos: FALLBACK.partOfSpeech,
    definition: FALLBACK.definition,
  };
});

const headerDate = computed(() => {
  if (display.value.date) return formatDate(display.value.date);
  return "—";
});

/* ------------------------------ Load ------------------------------ */

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const { data: fnData, error: fnError } = await supabase.functions.invoke("daily-word", {
      method: "GET",
    });

    if (fnError) throw fnError;

    const payload = fnData as DailyWordPayload;

    if (!payload || typeof payload.word !== "string") {
      throw new Error("Malformed response from daily-word function.");
    }

    data.value = payload;
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
/* Root should be visually “transparent” so the parent card owns surface/border/shadow */
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

  /* Container query anchor for smooth font scaling */
  container-type: inline-size;
  min-width: 0;
}

/* Top row (date) */
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

/* Body */
.dw-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  overflow: hidden;

  /* Flexbox shrink fix */
  min-width: 0;
}

/* Word — smooth container-based sizing, no JS */
.dw-word {
  font-weight: 850;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--table-on-surface);

  /* Critical: constrain within container */
  width: 100%;
  max-width: 100%;
  min-width: 0;

  /* Keep one line; never overflow the card */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  /* Smoothly scales with the widget width (cqw = 1% of container width) */
  font-size: clamp(20px, 10cqw, 34px);
}

/* Fallback if container query units are unsupported */
@supports not (width: 1cqw) {
  .dw-word {
    /* vw-based fallback: still smooth, slightly less precise than container sizing */
    font-size: clamp(20px, 6.5vw, 34px);
  }
}

/* Part of speech */
.dw-pos {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: color-mix(in srgb, var(--accent-primary) 70%, var(--table-on-surface) 30%);
}

/* Definition */
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

/* Footer */
.dw-foot {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--table-border) 70%, transparent);
}

.dw-source {
  font-size: 11px;
  color: var(--table-muted);
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Error */
.dw-error-msg {
  margin-top: 6px;
  font-size: 12px;
  color: color-mix(in srgb, var(--accent-danger) 70%, var(--table-on-surface) 30%);
}

/* Skeletons (token-based so it works on light/dark surfaces) */
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
.dw-skel-word {
  height: 38px;
  width: 72%;
}
.dw-skel-pos {
  height: 14px;
  width: 34%;
}
.dw-skel-def {
  height: 12px;
  width: 100%;
}

@keyframes dwShimmer {
  0% { transform: translateX(-60%); }
  100% { transform: translateX(60%); }
}
</style>
