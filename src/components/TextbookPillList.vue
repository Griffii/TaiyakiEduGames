<!-- src/components/TextbookPillList.vue -->
<template>
  <section class="tpl-root">
    <div class="tpl-inner">
      <!-- Status -->
      <p v-if="loading" class="tpl-muted">Loading textbooks…</p>
      <p v-else-if="error" class="tpl-error">{{ error }}</p>
      <p v-else-if="sortedTextbooks.length === 0" class="tpl-muted tpl-center">
        No textbooks found.
      </p>

      <section v-else class="tpl-section" aria-label="Textbook list">
        <header v-if="showSectionTitle" class="tpl-section-head">
          <h2 class="tpl-section-title">Textbooks</h2>
          <span class="tpl-section-count">({{ sortedTextbooks.length }})</span>
        </header>

        <ul class="tpl-list">
          <li v-for="tb in sortedTextbooks" :key="tb.id">
            <button
              type="button"
              class="tpl-pill"
              @click="openTextbook(tb)"
              :title="tb.title"
            >
              <!-- Icon bubble with cover or initial -->
              <span class="tpl-icon-wrap">
                <img
                  v-if="!isBroken(tb.id) && coverUrl(tb)"
                  class="tpl-icon"
                  :src="coverUrl(tb)!"
                  :alt="tb.title"
                  loading="lazy"
                  decoding="async"
                  @error.stop="() => markBroken(tb.id)"
                />
                <span v-else class="tpl-icon-fallback">
                  {{ tb.title?.charAt(0)?.toUpperCase() || '?' }}
                </span>
              </span>

              <!-- Main text + meta -->
              <span class="tpl-pill-main">
                <span class="tpl-pill-title">
                  {{ tb.title }}
                </span>

                <span class="tpl-pill-meta">
                  <span v-if="seriesOnly(tb)" class="tpl-pill-meta-item">
                    {{ seriesOnly(tb) }}
                  </span>
                  <span v-if="tb.year" class="tpl-pill-meta-item tpl-pill-meta-year">
                    {{ tb.year }}
                  </span>
                  <span class="tpl-pill-meta-item tpl-pill-meta-level">
                    {{ levelLabel(tb) }}
                  </span>
                </span>
              </span>

              <!-- Deck / card count chips -->
              <span class="tpl-pill-chips">
                <span
                  v-if="typeof tb.deck_count === 'number'"
                  class="tpl-chip"
                >
                  📚 {{ tb.deck_count }}
                </span>
                <span
                  v-if="typeof tb.unique_card_count === 'number'"
                  class="tpl-chip"
                >
                  🃏 {{ tb.unique_card_count }}
                </span>
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, withDefaults } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { withLoading } from '@/utils/withLoading'

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

const props = withDefaults(
  defineProps<{
    showSectionTitle?: boolean
  }>(),
  {
    showSectionTitle: true
  }
)

const BUCKET = 'public-assets'
const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const allTextbooks = ref<Textbook[]>([])

/* Broken cover tracking (icons) */
const brokenIds = reactive(new Set<string>())
const isBroken = (id: string) => brokenIds.has(id)
const markBroken = (id: string) => brokenIds.add(id)

/* Data helpers - copied from TextbookList.vue logic */
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

/* Sorted list, same ordering logic as TextbookList.vue */
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

/* Load textbooks + counts (same as TextbookList.vue) */
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
        unique_card_count: (r as any).unique_card_count ?? null
      })
    }

    allTextbooks.value = (tbs || []).map(tb => {
      const c = map.get(tb.id) || {
        deck_count: null,
        unique_card_count: null
      }
      return { ...tb, ...c }
    }) as Textbook[]
  } catch (e: any) {
    console.error(e)
    error.value = e?.message ?? String(e)
  } finally {
    loading.value = false
  }
}

/* Navigation — same route as TextbookList cards */
function openTextbook(tb: Textbook) {
  router.push({ name: 'textbook_details', params: { id: tb.id } })
}

onMounted(async () => {
  await withLoading(async () => {
    await loadTextbooks()
  }, 150)
})
</script>

<style scoped>
/* =========================
   Root container
   ========================= */

.tpl-root {
  width: 100%;
  color: var(--textbook-on-surface);
}

.tpl-inner {
  padding: 0.4rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Text utilities */
.tpl-muted {
  color: var(--main-text-soft);
  font-size: 0.9rem;
}

.tpl-error {
  color: var(--accent-danger);
  font-weight: 600;
}

.tpl-center {
  text-align: center;
}

/* Section card – using AppHeader tokens */
.tpl-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  border-radius: var(--radius-lg);
  border: 2px solid var(--header-border-color);
  background: var(--header-surface);
  box-shadow: var(--header-shadow);
  padding: 0.55rem 0.6rem 0.65rem;
}

/* Section header */
.tpl-section-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0 0.15rem 0.1rem;
}

.tpl-section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--header-on-surface);
}

.tpl-section-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--main-text-soft);
}

/* =========================
   Vertical list + pills
   ========================= */

.tpl-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tpl-pill {
  --pill-border: var(--textbook-border);

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;

  width: 100%;
  padding: 0.45rem 0.7rem 0.45rem 0.4rem;

  border-radius: 999px;
  border: 2px solid var(--pill-border);
  background: var(--textbook-surface);

  color: var(--textbook-on-surface);
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;

  cursor: pointer;
  text-align: left;

  box-shadow: var(--textbook-shadow);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    background-color 0.16s ease;
}

.tpl-pill:hover {
  transform: translateY(-1px);
  box-shadow: var(--elevation-2);
  border-color: color-mix(
    in srgb,
    var(--accent-primary) 60%,
    var(--textbook-border) 40%
  );
}

.tpl-pill:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* Icon bubble */
.tpl-icon-wrap {
  flex: 0 0 auto;
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 999px;
  border: 2px solid color-mix(
    in srgb,
    var(--textbook-border) 60%,
    #000 40%
  );
  background: radial-gradient(
    circle at 30% 20%,
    rgba(255, 255, 255, 0.32),
    transparent 55%
  );
  display: grid;
  place-items: center;
  overflow: hidden;
}

.tpl-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tpl-icon-fallback {
  font-weight: 800;
  font-size: 1rem;
  color: var(--textbook-on-surface);
}

/* Pill content */
.tpl-pill-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.tpl-pill-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 800;
}

.tpl-pill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  font-size: 0.78rem;
}

.tpl-pill-meta-item {
  color: var(--main-text-soft);
}

.tpl-pill-meta-year {
  font-weight: 900;
  color: var(--textbook-on-surface);
}

.tpl-pill-meta-level {
  font-weight: 700;
  letter-spacing: 0.03em;
}

/* Deck / card count chips on right */
.tpl-pill-chips {
  flex: 0 0 auto;
  display: inline-flex;
  flex-direction: column;
  gap: 0.18rem;
  align-items: flex-end;
}

.tpl-chip {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--textbook-chip-on);
  background: var(--textbook-chip-bg);
  border: 1px solid var(--textbook-border);
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 640px) {
  .tpl-inner {
    padding: 0.35rem 0;
  }

  .tpl-section {
    padding: 0.45rem 0.5rem 0.55rem;
  }

  .tpl-pill {
    padding: 0.35rem 0.6rem 0.35rem 0.35rem;
    font-size: 0.9rem;
  }

  .tpl-icon-wrap {
    width: 1.9rem;
    height: 1.9rem;
  }

  .tpl-section-title {
    font-size: 0.9rem;
  }

  .tpl-section-count {
    font-size: 0.8rem;
  }
}
</style>
