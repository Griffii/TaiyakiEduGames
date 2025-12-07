<!-- src/views/flashcard-system/TextbookDetails.vue -->
<template>
  <div class="page">
    <main class="content">
      <p v-if="loading" class="muted">Loading textbook…</p>
      <p v-if="error" class="error">{{ error }}</p>

      <!-- Textbook header (condensed, capped size) -->
      <section v-if="!loading && !error && tb" class="tb-head">
        <div class="cover-wrap">
          <img class="cover" :src="coverUrl(tb)" :data-key="tb?.cover_image_url ? normalizeKey(tb.cover_image_url) : ''"
            :alt="tb.title" referrerpolicy="no-referrer" @error="onCoverError($event)" />
        </div>
        <div class="tb-meta">
          <h2 class="tb-title">{{ tb.title }}</h2>
          <p class="tb-sub">
            <span v-if="tb.year">{{ tb.year }}</span>
          </p>
          <div class="tb-counts chips">
            <span class="chip"><strong>{{ deckTotal }}</strong> decks</span>
            <span class="chip"><strong>{{ totalCards }}</strong> cards</span>
          </div>

          <div v-if="tb.tags?.length" class="chips">
            <span class="chip" v-for="tag in tb.tags" :key="tag">{{ tag }}</span>
          </div>
        </div>
      </section>

      <!-- Activities -->
      <section v-if="!loading && !error" class="section">
        <div class="section-head">
          <h3 class="section-title">Activities</h3>
        </div>

        <div v-if="activities.length" class="grid grid--activities">
          <button v-for="a in activities" :key="a.id" class="activity-card" type="button" @click="openActivity(a.slug)"
            @keydown.enter.prevent="openActivity(a.slug)">
            <div class="thumb-wrap">
              <img class="thumb" :src="activityThumbUrl(a)"
                :data-key="a.thumbnail_url ? normalizeKey(a.thumbnail_url) : ''" :alt="a.name"
                referrerpolicy="no-referrer" @error="onActivityThumbError($event)" />
            </div>

            <div class="deck-top">
              <strong class="deck-title">{{ a.name }}</strong>
            </div>

            <div v-if="a.tags?.length" class="chips small">
              <span class="chip" v-for="tag in a.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
              <span v-if="a.tags.length > 3" class="chip more">+{{ a.tags.length - 3 }}</span>
            </div>
          </button>
        </div>

        <p v-else class="muted">No activities linked to this textbook yet.</p>
      </section>

      <!-- Decks -->
      <section v-if="!loading && !error" class="section">
        <div class="section-head">
          <h3 class="section-title">Decks</h3>
        </div>

        <div v-if="decks.length" class="grid grid--decks">
          <div v-for="d in decks" :key="d.id" class="deck-card" @click="openDeck(d.id)" role="button" tabindex="0"
            @keydown.enter.prevent="openDeck(d.id)">
            <div class="thumb-wrap deck-thumb-wrap">
              <img class="thumb deck-thumb" :src="deckThumbUrl(d)"
                :data-key="d.thumbnail_url ? normalizeKey(d.thumbnail_url) : ''" :alt="d.title"
                referrerpolicy="no-referrer" @error="onThumbError($event)" />
            </div>
            <div class="deck-top">
              <strong class="deck-title">{{ d.title }}</strong>
            </div>
            <div class="deck-sub">
              <span class="pill">{{ cardCount(d.id) }} cards</span>
            </div>
          </div>
        </div>

        <p v-else class="muted">No decks linked to this textbook yet.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { withLoading } from '@/utils/withLoading'
import GriffinLogo from '@/assets/images/logos/GriffiiLogo.png'

type TextbookRow = {
  id: string
  slug: string
  title: string
  year: number | null
  series: string | null
  tags: string[] | null
  cover_image_url: string | null
}

type DeckRow = {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
}

type ActivityRow = {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  tags: string[] | null
}

const route = useRoute()
const router = useRouter()
const tbId = computed(() => String(route.params.id ?? ''))

const loading = ref(false)
const error = ref<string | null>(null)

const tb = ref<TextbookRow | null>(null)
const decks = ref<DeckRow[]>([])
const activities = ref<ActivityRow[]>([])
const countsByDeck = ref<Map<string, number>>(new Map())

// totals (kept for header; falls back to computed if view is absent)
const totals = ref<{ deck_count: number; unique_card_count: number } | null>(null)

const coverFallback = GriffinLogo
const thumbFallback = GriffinLogo

// Prefer server totals if available; otherwise compute from client-side data
const deckTotal = computed(() =>
  totals.value?.deck_count ?? decks.value.length
)
const totalCards = computed(() => {
  if (typeof totals.value?.unique_card_count === 'number') {
    return totals.value!.unique_card_count
  }
  let sum = 0
  for (const n of countsByDeck.value.values()) sum += n
  return sum
})

function openDeck(id: string) {
  // Note: app routes to '/deck/:id'
  router.push(`/deck/${id}`)
}
function openActivity(slug: string) {
  router.push(`/activities/${slug}`)
}

function normalizeKey(raw: string) {
  return raw
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
    .split('/')
    .map(s => s.trim())
    .filter(Boolean)
    .join('/')
}

function transformUrl(key: string, width: number, height: number) {
  const normalized = normalizeKey(key)
  const { data } = supabase.storage
    .from('public-assets')
    .getPublicUrl(normalized, { transform: { width, height, resize: 'cover' } })
  return data.publicUrl
}

function objectUrl(key: string) {
  const normalized = normalizeKey(key)
  const { data } = supabase.storage.from('public-assets').getPublicUrl(normalized)
  return data.publicUrl
}

/* ----- Cover image ----- */
function coverUrl(row: TextbookRow) {
  if (!row.cover_image_url) return coverFallback
  return transformUrl(row.cover_image_url, 360, 504) || coverFallback
}
function onCoverError(e: Event) {
  const img = e.target as HTMLImageElement
  img.onerror = null
  const key = img.dataset.key || ''
  img.src = key ? (objectUrl(key) || coverFallback) : coverFallback
}

/* ----- Deck thumbnails ----- */
function deckThumbUrl(d: DeckRow) {
  if (!d.thumbnail_url) return thumbFallback
  return transformUrl(d.thumbnail_url, 300, 300) || thumbFallback
}
function onThumbError(e: Event) {
  const img = e.target as HTMLImageElement
  img.onerror = null
  const key = img.dataset.key || ''
  img.src = key ? (objectUrl(key) || thumbFallback) : thumbFallback
}

/* ----- Activity thumbnails ----- */
function activityThumbUrl(a: ActivityRow) {
  if (!a.thumbnail_url) return thumbFallback
  return transformUrl(a.thumbnail_url, 300, 300) || thumbFallback
}
function onActivityThumbError(e: Event) {
  const img = e.target as HTMLImageElement
  img.onerror = null
  const key = img.dataset.key || ''
  img.src = key ? (objectUrl(key) || thumbFallback) : thumbFallback
}

/* ----- Counts (via view) ----- */
function cardCount(deckId: string) {
  return countsByDeck.value.get(deckId) ?? 0
}

onMounted(loadAll)
watch(tbId, loadAll)

async function loadAll() {
  await withLoading(async () => {
    if (!tbId.value) { error.value = 'Missing textbook id.'; return }
    try {
      loading.value = true
      error.value = null
      await loadTextbook()
      await Promise.all([loadDecksForTextbook(), loadActivitiesForTextbook()])
      await Promise.all([loadTotalsFromView(), loadCardCountsForDecks()])
    } catch (e: any) {
      console.error('[TextbookDetails] load failed:', e)
      error.value = e?.message ?? String(e)
    } finally {
      loading.value = false
    }
  }, 150)
}

async function loadTextbook() {
  const { data, error: err } = await supabase
    .from('textbooks')
    .select('id, slug, title, year, series, tags, cover_image_url')
    .eq('id', tbId.value)
    .is('archived_at', null)
    .single()
  if (err) throw err
  if (data?.cover_image_url) data.cover_image_url = normalizeKey(String(data.cover_image_url))
  tb.value = data as TextbookRow
}

async function loadDecksForTextbook() {
  const { data, error: err } = await supabase
    .from('textbook_decks')
    .select('deck:decks(id, title, slug, thumbnail_url, archived_at)')
    .eq('textbook_id', tbId.value)
  if (err) throw err

  const list: DeckRow[] = []
  for (const row of (data ?? []) as any[]) {
    const field = (row as any).deck
    const arr = Array.isArray(field) ? field : (field ? [field] : [])
    for (const dk of arr) {
      if (!dk || dk.archived_at) continue
      list.push({
        id: String(dk.id),
        title: String(dk.title),
        slug: String(dk.slug),
        thumbnail_url: dk.thumbnail_url ? normalizeKey(String(dk.thumbnail_url)) : null,
      })
    }
  }
  const seen = new Set<string>()
  decks.value = list
    .filter(d => (seen.has(d.id) ? false : (seen.add(d.id), true)))
    .sort((a, b) => a.title.localeCompare(b.title))
}

async function loadActivitiesForTextbook() {
  const { data, error: err } = await supabase
    .from('textbook_activities')
    .select('activity:activities(id, name, slug, thumbnail_url, tags, archived_at)')
    .eq('textbook_id', tbId.value)
  if (err) throw err

  const list: ActivityRow[] = []
  for (const row of (data ?? []) as any[]) {
    const field = (row as any).activity
    const arr = Array.isArray(field) ? field : (field ? [field] : [])
    for (const ac of arr) {
      if (!ac || ac.archived_at) continue
      list.push({
        id: String(ac.id),
        name: String(ac.name),
        slug: String(ac.slug),
        thumbnail_url: ac.thumbnail_url ? normalizeKey(String(ac.thumbnail_url)) : null,
        tags: Array.isArray(ac.tags) ? ac.tags : null,
      })
    }
  }
  const seen = new Set<string>()
  activities.value = list
    .filter(a => (seen.has(a.id) ? false : (seen.add(a.id), true)))
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function loadTotalsFromView() {
  // Keep supporting the existing totals view if present
  const { data, error: err } = await supabase
    .from('v_textbook_deck_card_totals')
    .select('deck_count, unique_card_count')
    .eq('textbook_id', tbId.value)
    .maybeSingle()

  if (err) {
    // Non-fatal; totals can be computed on the client
    console.warn('[TextbookDetails] totals view missing or errored:', err.message)
    totals.value = null
    return
  }
  totals.value = {
    deck_count: Number(data?.deck_count ?? 0),
    unique_card_count: Number(data?.unique_card_count ?? 0),
  }
}

async function loadCardCountsForDecks() {
  const ids = decks.value.map(d => d.id)
  countsByDeck.value = new Map()
  if (!ids.length) return

  // NEW: Use the accurate per-deck counts view
  const { data, error } = await supabase
    .from('deck_card_counts')
    .select('deck_id, unique_card_count')
    .in('deck_id', ids)

  if (error) throw error

  const map = new Map<string, number>()
  for (const id of ids) map.set(id, 0) // default to 0 so chip never shows "…"
  for (const row of (data ?? []) as Array<{ deck_id: string; unique_card_count: number }>) {
    map.set(String(row.deck_id), Number(row.unique_card_count ?? 0))
  }
  countsByDeck.value = map
}
</script>

<style scoped>
/* Page scaffold */
.page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow-x: hidden;

  padding-top: var(--app-header-height);
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px;
  display: grid;
  gap: 18px;
  align-content: start;
  box-sizing: border-box;
  color: var(--main-text-color);
}

/* ===============================
   Textbook header (condensed)
   =============================== */
.tb-head {
  width: min(480px, 92vw);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 12px;
  align-items: start;
  background: var(--textbook-surface);
  border: 2px solid var(--textbook-border);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--textbook-shadow);
  box-sizing: border-box;
}

.cover-wrap {
  background: var(--neutral-100);
  aspect-ratio: 5/7;
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: grid;
  place-items: center;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tb-meta {
  display: grid;
  gap: 8px;
}

.tb-title {
  margin: 0;
  font-size: 19px;
  color: var(--textbook-on-surface);
}

.tb-sub {
  margin: 0;
  font-size: 12px;
  color: var(--main-text-soft);
}

.tb-counts {
  margin-top: 2px;
  font-size: 13px;
  color: var(--textbook-on-surface);
}

.tb-counts strong {
  color: var(--textbook-on-surface);
}

/* ===============================
   Chips / Tags
   =============================== */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--neutral-100);
  color: var(--textbook-on-surface);
  border: 1px solid var(--textbook-border);
}

.chips.small {
  gap: 4px;
}

.chips.small .chip {
  padding: 2px 6px;
  font-size: 11px;
}

.chip.more {
  background: var(--neutral-0);
  color: var(--main-text-soft);
  border-color: var(--textbook-border);
}

/* Sections */
.section {
  display: grid;
  gap: 12px;
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  font-size: 24px;
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}

/* ==============================
   Responsive, centered card grids
   ============================== */
.grid {
  --min: 180px;
  width: min(1200px, 80vw);
  margin-inline: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--min), 1fr));
  gap: 12px;
  justify-items: center;
  align-items: start;
  box-sizing: border-box;
}

.grid--decks,
.grid--activities {
  padding: 10px 12px 14px;
  width: 60vw;
}

.grid--activities {
  --min: 200px;
  grid-template-columns: repeat(auto-fill, minmax(var(--min), 240px));
  justify-content: center;
  justify-items: stretch;
}

/* Shared card base */
.deck-card,
.activity-card {
  cursor: pointer;
  border-radius: var(--radius-md);
  padding: 12px;
  background: var(--textbook-surface);
  transition: transform .06s ease, box-shadow .15s ease, border-color .15s ease;
  display: grid;
  gap: 8px;
  width: 100%;
  text-align: left;
  box-shadow: var(--textbook-shadow);
  outline: none;
  box-sizing: border-box;
}

.deck-card:focus-visible,
.activity-card:focus-visible {
  box-shadow: 0 0 0 3px var(--focus-ring), var(--textbook-shadow);
  transform: translateY(-2px);
}

/* Deck cards — use Deck tokens + explicit border */
.deck-card {
  --deck-card-h: 260px;
  max-width: 240px;
  height: var(--deck-card-h);
  background: var(--decks-surface);
  color: var(--decks-on-surface);
  border: 3px solid var(--decks-border);
  box-shadow: var(--decks-shadow);
  display: grid;
  grid-template-rows: auto auto 1fr;
}

.deck-card:hover {
  transform: translateY(-2px);
}

/* Activities keep textbook styling */
.activity-card {
  appearance: none;
  max-width: 240px;
  border-color: 3px solid var(--activities-border);
  padding: 10px;
}

.activity-card:hover {
  transform: translateY(-2px);
}

/* Thumbnails */
.thumb-wrap {
  background: transparent;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  display: grid;
  place-items: center;
}

.deck-thumb-wrap {
  min-height: 140px;
  max-height: 160px;
}

.thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
  display: block;
}

.deck-thumb {
  padding: 14px;
}

/* Titles + meta inside cards */
.deck-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.deck-title {
  font-size: 16px;
  color: var(--decks-on-surface);
  line-height: 1.2;
}

.deck-sub {
  color: var(--main-text-soft);
  font-size: 12px;
  align-self: end;
}

/* ===============================
   Pills — use decks pill tokens
   =============================== */
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  line-height: 1;
  background: var(--decks-pill-surface);
  border: 1px solid var(--decks-pill-border);
  color: var(--decks-pill-on);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35);
}

/* Message helpers */
.muted {
  color: var(--main-text-soft);
}

.error {
  color: var(--accent-pink);
}

/* ---------------------------
   Mobile friendliness tweaks
   --------------------------- */

@media (max-width: 1024px) {
  .grid {
    width: 92vw;
    --min: 170px;
    gap: 10px;
  }

  .grid--activities {
    --min: 190px;
    grid-template-columns: repeat(auto-fill, minmax(var(--min), 220px));
  }
}

@media (max-width: 900px) {
  .content {
    padding: 16px;
  }

  .tb-head {
    width: min(460px, 94vw);
    grid-template-columns: 150px 1fr;
    gap: 10px;
    padding: 12px;
  }

  .tb-title {
    font-size: 18px;
  }

  .thumb {
    padding: 14px;
  }

  .deck-card {
    --deck-card-h: 300px;
    max-width: 240px;
  }
}

@media (max-width: 640px) {
  .tb-head {
    width: 94vw;
    grid-template-columns: 1fr;
    text-align: center;
    justify-items: center;
    padding: 12px;
  }

  .cover-wrap {
    width: 66%;
    max-width: 220px;
  }

  .tb-meta {
    justify-items: center;
  }

  .tb-title {
    font-size: 17px;
  }

  .tb-sub {
    font-size: 12px;
  }

  .chips,
  .tb-counts {
    justify-content: center;
  }

  .grid {
    width: 96vw;
    --min: 150px;
    gap: 10px;
  }

  .grid--decks,
  .grid--activities {
    padding: 10px 8px 14px;
  }

  .grid--activities {
    --min: 170px;
    grid-template-columns: repeat(auto-fill, minmax(var(--min), 210px));
  }

  .deck-card {
    --deck-card-h: 280px;
    max-width: 220px;
  }

  .activity-card {
    max-width: 210px;
    padding: 9px;
  }

  .thumb {
    padding: 12px;
  }

  .deck-title {
    font-size: 15px;
  }
}

@media (max-width: 420px) {
  .content {
    padding: 14px 12px;
    gap: 14px;
  }

  .grid {
    width: 98vw;
    --min: 140px;
    gap: 8px;
  }

  .grid--decks,
  .grid--activities {
    padding: 8px 6px 12px;
  }

  .grid--activities {
    --min: 150px;
    grid-template-columns: repeat(auto-fill, minmax(var(--min), 1fr));
  }

  .deck-card {
    --deck-card-h: 220px;
    max-width: 100%;
  }

  .activity-card {
    max-width: 100%;
  }

  .thumb {
    padding: 10px;
  }

  .deck-title {
    font-size: 14px;
  }

  .pill {
    padding: 2px 6px;
  }
}
</style>
