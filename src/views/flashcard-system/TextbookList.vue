<!-- src/views/flashcard-system/TextbookList.vue -->
<template>
  <div class="page">
    <header class="head">
      <div class="head-inner">
        <div class="head-text">
          <!-- Put text here if needed later -->
        </div>
      </div>
    </header>

    <main class="content">
      <p v-if="loading" class="muted">Loading textbooks…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="allTextbooks.length === 0" class="muted">No textbooks found.</p>

      <!-- Single compact grid of all textbooks -->
      <section v-else class="grid" aria-label="Textbook list">
        <RouterLink v-for="tb in sortedTextbooks" :key="tb.id" class="card" role="listitem"
          :to="{ name: 'textbook_details', params: { id: tb.id } }" :title="tb.title">
          <div class="cover-wrap">
            <img v-if="!isBroken(tb.id) && coverUrl(tb)" class="cover" :src="coverUrl(tb)!" :alt="tb.title"
              loading="lazy" decoding="async" @error="() => markBroken(tb.id)" />
            <div v-else class="cover-fallback">
              <span class="cover-title">{{ tb.title }}</span>
            </div>

            <!-- bottom-right chips: deck_count + unique_card_count -->
            <div class="chips br">
              <span class="chip" v-if="typeof tb.deck_count === 'number'">
                📚 {{ tb.deck_count }}
              </span>
              <span class="chip" v-if="typeof tb.unique_card_count === 'number'">
                🃏 {{ tb.unique_card_count }}
              </span>
            </div>
          </div>

          <div class="meta">
            <div class="t">{{ tb.title }}</div>

            <!-- Series (if any) -->
            <div class="s" v-if="seriesOnly(tb)">{{ seriesOnly(tb) }}</div>

            <!-- Year -->
            <div class="s year" v-if="tb.year">
              {{ tb.year }}
            </div>

            <!-- NEW: School level label (小学校 / 中学校 / 高校 / 他) under the year -->
            <div class="s level">
              {{ levelLabel(tb) }}
            </div>
          </div>
        </RouterLink>
      </section>

      <!-- Custom Deck Button -->
      <section class="cd-centered">
        <CustomDeckButton />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">

import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { withLoading } from '@/utils/withLoading'
import CustomDeckButton from '@/components/CustomDeckButton.vue'

type Textbook = {
  id: string
  title: string
  slug?: string | null
  series?: string | null
  year?: number | string | null
  tags?: string[] | null
  cover_image_url?: string | null
  deck_count?: number | null
  unique_card_count?: number | null
}

const BUCKET = 'public-assets'

const loading = ref(true)
const error = ref<string | null>(null)
const allTextbooks = ref<Textbook[]>([])

const isAuthed = ref(false)

/* Broken cover tracking */
const brokenIds = reactive(new Set<string>())
const isBroken = (id: string) => brokenIds.has(id)
const markBroken = (id: string) => brokenIds.add(id)

/* Data helpers */
function isHttpUrl(s?: string | null): boolean {
  return !!s && /^https?:\/\//i.test(s)
}
function resolvePublicUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl || ''
}
function coverUrl(tb: Textbook): string | '' {
  const raw = tb.cover_image_url || ''
  if (!raw) return ''
  return isHttpUrl(raw) ? raw : resolvePublicUrl(String(raw))
}
function seriesOnly(tb: Textbook): string {
  return tb.series ? String(tb.series) : ''
}

/* Japanese level label from tags */
function levelLabel(tb: Textbook): string {
  const tags = (tb.tags || []).map(t => String(t).toUpperCase().trim())
  if (tags.includes('ES')) return '小学校'
  if (tags.includes('JHS')) return '中学校'
  if (tags.includes('HS')) return '高校'
  return '他'
}

/* Unified sorted list */
const sortedTextbooks = computed(() => {
  const books = [...allTextbooks.value]
  const sorter = (a: Textbook, b: Textbook) => {
    const sa = `${a.series || ''}${a.year || ''}${a.title}`
    const sb = `${b.series || ''}${b.year || ''}${b.title}`
    return sa.localeCompare(sb, undefined, { numeric: true })
  }
  books.sort(sorter)
  return books
})

/* Load data */
async function loadTextbooks() {
  loading.value = true
  error.value = null
  try {
    const { data: tbs, error: err1 } = await supabase
      .from('textbooks')
      .select('id, title, slug, series, year, tags, cover_image_url')
      .order('title', { ascending: true })

    if (err1) throw err1

    const { data: counts, error: err2 } = await supabase
      .from('v_textbook_deck_card_totals')
      .select('textbook_id, deck_count, unique_card_count')

    if (err2) throw err2

    const map = new Map<
      string,
      { deck_count: number | null; unique_card_count: number | null }
    >()
    for (const r of counts || []) {
      const k =
        (r as any).textbook_id ??
        (r as any).id ??
        (r as any).textbook_uuid
      if (!k) continue
      map.set(String(k), {
        deck_count: (r as any).deck_count ?? null,
        unique_card_count: (r as any).unique_card_count ?? null,
      })
    }

    allTextbooks.value = (tbs || []).map(tb => {
      const c = map.get(tb.id) || {
        deck_count: null,
        unique_card_count: null,
      }
      return { ...tb, ...c }
    }) as Textbook[]
  } catch (e: any) {
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

/* Auth check for "Custom Decks" button (kept for future use) */
async function checkAuth() {
  const { data } = await supabase.auth.getSession()
  isAuthed.value = !!data.session
}

onMounted(async () => {
  await withLoading(
    async () => {
      await Promise.all([loadTextbooks(), checkAuth()])
    },
    150
  )
})
</script>

<style scoped>
/* =========================
   Textbook List — tokenized (theme.css)
   ========================= */

/* Page layout */
.page {
  padding: 24px;
}

/* Make the content follow its parent width */
.content {
  display: grid;
  gap: 24px;
  width: 100%;
  max-width: 100%;
  margin: 0;
  color: var(--main-text-color);
  box-sizing: border-box;
}

/* Header */
.head {
  padding: 0.25rem 0 0.5rem;
}

.head-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.head-text {
  display: grid;
  gap: 4px;
}

.head .title {
  margin: 0;
  color: var(--main-title-color);
  font-weight: 800;
  font-size: 1.9rem;
  text-shadow: var(--main-title-shadow);
}

.head .sub {
  margin: 0;
  color: var(--main-subtitle-color);
  font-weight: 600;
  font-size: 0.95rem;
  text-shadow: var(--main-subtitle-shadow);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* SINGLE GRID
   - auto-fit: adapt to container width
   - clamp: cards shrink for small containers but don't get huge */
.grid {
  display: grid;
  width: 100%;
  max-width: 100%;
  grid-template-columns: repeat(auto-fit,
      minmax(clamp(90px, 14vw, 180px), 1fr));
  gap: 12px;
  padding: 8px;
  justify-content: center;
  box-sizing: border-box;
}


/* Card */
.card {
  text-decoration: none;
  color: inherit;
  background: var(--textbook-surface);
  border: 1px solid var(--textbook-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--textbook-shadow);
  transform: translateY(0);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
  min-width: 0;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--elevation-2);
  border-color: var(--textbook-border);
}

/* Image area */
.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  background: var(--neutral-100);
  display: grid;
  place-items: center;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Fallback (title as cover) */
.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 10px;
  text-align: center;
}

.cover-title {
  font-weight: 800;
  font-size: 14px;
  color: var(--textbook-on-surface);
}

/* Chips overlay — bottom-right count chips */
.chips {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  font-size: 11px;
  font-weight: 800;
  color: var(--textbook-chip-on);
  background: var(--textbook-chip-bg);
  border: 1px solid var(--textbook-border);
  padding: 2px 7px;
  border-radius: 999px;
}

/* Meta */
.meta {
  display: grid;
  gap: 3px;
  padding: 9px 10px 10px;
}

.t {
  font-weight: 800;
  font-size: 14px;
  line-height: 1.2;
  color: var(--textbook-on-surface);
}

/* Year: bigger + bold for readability */
.s.year {
  color: var(--textbook-on-surface);
  font-size: 13.5px;
  font-weight: 900;
  text-shadow: 0 1px 0 color-mix(in srgb, var(--neutral-900) 35%, transparent);
}

/* General small text */
.s {
  color: var(--main-text-soft);
  font-size: 11.5px;
}

/* Level label styling */
.s.level {
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* Muted / error */
.muted {
  color: var(--main-text-soft);
  font-size: 0.9rem;
}

.error {
  color: var(--danger);
  font-weight: 600;
}

/* Custom Deck Button styling */
.cd-centered {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Small, consistent vertical spacing between sections */
  margin: 0.35rem 0;
  padding: 0.35rem 0;
}

/* Responsive tweaks – just soften fonts a bit on small screens */
@media (max-width: 899px) {
  .head .title {
    font-size: 1.75rem;
  }

  .t {
    font-size: 13.5px;
  }
}

@media (max-width: 519px) {
  .head-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .head-actions {
    width: 100%;
  }

  .t {
    font-size: 13px;
  }

  .s {
    font-size: 11px;
  }
}
</style>
