<!-- src/views/ActivitiesList.vue -->
<template>
  <div class="page">
    <header class="head">
      <div class="left">
        <h1 class="title">Activities</h1>
        <span class="count" v-if="!loading">({{ activitiesSorted.length }})</span>
      </div>
    </header>

    <main class="content">
      <p v-if="loading" class="muted">Loading activities…</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <section v-else class="list-section">
        <div v-if="activitiesSorted.length === 0" class="muted center">
          No activities found.
        </div>

        <!-- Regular Activities -->
        <div v-else>
          <div v-if="regularActivities.length" class="section-head">
            <h2 class="section-title">Games</h2>
            <span class="section-count">({{ regularActivities.length }})</span>
          </div>

          <div v-if="regularActivities.length" class="tb-grid">
            <article
              v-for="a in regularActivities"
              :key="a.id"
              class="tb-card"
              @click="openActivity(a)"
            >
              <div class="corner-rail">
                <div v-if="isXp(a)" class="corner tl xp"><span>XP</span></div>
                <div v-if="isNew(a)" class="corner tr new"><span>NEW</span></div>
              </div>

              <figure class="cover">
                <img
                  v-if="thumbUrl(a)"
                  :src="thumbUrl(a)"
                  :alt="a.name"
                  loading="lazy"
                  decoding="async"
                  @error.stop="onThumbError(a.id)"
                />
                <div v-else class="cover-fallback">
                  <span class="cover-fallback-title">{{ a.name }}</span>
                </div>
              </figure>

              <div class="tb-body">
                <h3 class="tb-title">{{ a.name }}</h3>
                <div class="chip-row" v-if="(a.tags || []).length">
                  <span v-for="tag in a.tags" :key="String(tag)" class="chip">{{ tag }}</span>
                </div>
              </div>
            </article>
          </div>

          <!-- Teacher Tools -->
          <div v-if="teacherTools.length" class="section-head tools-head">
            <h2 class="section-title">Teacher Tools</h2>
            <span class="section-count">({{ teacherTools.length }})</span>
          </div>

          <div v-if="teacherTools.length" class="tb-grid">
            <article
              v-for="a in teacherTools"
              :key="a.id"
              class="tb-card"
              @click="openActivity(a)"
            >
              <div class="corner-rail">
                <div v-if="isXp(a)" class="corner tl xp"><span>XP</span></div>
                <div v-if="isNew(a)" class="corner tr new"><span>NEW</span></div>
              </div>

              <figure class="cover">
                <img
                  v-if="thumbUrl(a)"
                  :src="thumbUrl(a)"
                  :alt="a.name"
                  loading="lazy"
                  decoding="async"
                  @error.stop="onThumbError(a.id)"
                />
                <div v-else class="cover-fallback">
                  <span class="cover-fallback-title">{{ a.name }}</span>
                </div>
              </figure>

              <div class="tb-body">
                <h3 class="tb-title">{{ a.name }}</h3>
                <div class="chip-row" v-if="(a.tags || []).length">
                  <span v-for="tag in a.tags" :key="String(tag)" class="chip">{{ tag }}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { withLoading } from '@/utils/withLoading'

type UUID = string
type Activity = {
  id: UUID
  slug: string
  name: string
  type?: string | null
  url_path?: string | null
  external_url?: string | null
  icon_url?: string | null
  thumbnail_url?: string | null
  tags?: string[] | null
  status?: string | null
  archived_at?: string | null
}

const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const activities = ref<Activity[]>([])
const failedThumbs = ref<Set<string>>(new Set())

function normTags(a: Activity): string[] {
  return (a.tags || []).map(t => String(t).toLowerCase().trim())
}

function isTeacherTool(a: Activity): boolean {
  const tags = normTags(a)
  return tags.includes('teacher tool') || tags.includes('teacher-tool') || tags.includes('teachertool')
}

function isXp(a: Activity): boolean {
  const tags = normTags(a)
  return tags.includes('xp') || tags.includes('gives_xp') || tags.includes('givesxp') || tags.includes('experience')
}

function isNew(a: Activity): boolean {
  const tags = normTags(a)
  if (a.status && String(a.status).toLowerCase().trim() === 'new') return true
  return tags.includes('new') || tags.includes('recent')
}

onMounted(async () => {
  await withLoading(async () => {
    try {
      const { data, error: e } = await supabase
        .from('activities')
        .select('id, slug, name, type, url_path, external_url, icon_url, thumbnail_url, tags, status, archived_at')
        .is('archived_at', null)
        .order('name', { ascending: true })

      if (e) throw e
      activities.value = (data || []) as Activity[]
    } catch (e: any) {
      console.error(e)
      error.value = e?.message ?? String(e)
    } finally {
      loading.value = false
    }
  }, 250)
})

const activitiesSorted = computed(() =>
  activities.value.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
)

const teacherTools = computed(() => activitiesSorted.value.filter(isTeacherTool))
const regularActivities = computed(() => activitiesSorted.value.filter(a => !isTeacherTool(a)))

/* ---- URL helpers ---- */
function isHttpUrl(s?: string | null): boolean {
  return !!s && /^[a-z][a-z0-9+\-.]*:\/\//i.test(String(s).trim())
}

const ASSET_BUCKET = 'public-assets'
const ICONS_PREFIX = 'game-icons/'

function thumbUrl(a: Activity): string {
  if (failedThumbs.value.has(a.id)) return ''
  const raw = a.thumbnail_url || a.icon_url || ''
  if (!raw) return ''
  if (isHttpUrl(raw)) return raw

  let key = String(raw).replace(/^\/+/, '')
  if (!key.startsWith(ICONS_PREFIX)) key = ICONS_PREFIX + key
  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(key)
  return data?.publicUrl || ''
}

function onThumbError(id: string) {
  failedThumbs.value.add(id)
}

function toAbsoluteExternal(raw?: string | null): string {
  if (!raw) return ''
  let s = String(raw).trim()
  if (!s) return ''

  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(s)) return s
  if (/^[a-z][a-z0-9+\-.]*:/i.test(s)) return s
  if (s.startsWith('//')) return (window.location?.protocol || 'https:') + s

  if (/^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(s)) s = 'https://' + s

  try {
    const u = new URL(s, window.location.origin)
    const hasExt = /\.[a-z0-9]+$/i.test(u.pathname.split('/').pop() || '')
    if (!hasExt && !u.search && !u.hash && !u.pathname.endsWith('/')) {
      u.pathname += '/'
    }
    return u.toString()
  } catch {
    return s
  }
}

function normalizeInternalPath(raw?: string | null): string {
  if (!raw) return ''
  let s = String(raw).trim()
  if (!s) return ''
  if (!s.startsWith('/')) s = '/' + s
  return s
}

function openActivity(a: Activity) {
  if (a.url_path) {
    router.push(normalizeInternalPath(a.url_path))
    return
  }
  if (a.slug) {
    router.push(`/activities/${a.slug}`)
    return
  }
  if (a.external_url) {
    const url = toAbsoluteExternal(a.external_url)
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
  }
  alert('No activity URL is configured.')
}
</script>

<style scoped>
/* Page */
.page {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 1rem;
  padding-left: 20vw;
  padding-right: 20vw;
  padding-top: 2rem;
  padding-bottom: 3rem;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--main-title-color);
}

.left {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0;
  color: var(--main-title-color);
  text-shadow: var(--main-title-shadow);
}

.count {
  color: var(--main-text-soft);
  font-weight: 600;
}

.content {
  display: grid;
  gap: 1rem;
}

.muted { color: var(--main-text-soft); }
.error { color: var(--accent-danger); }
.center { text-align: center; }

/* Section headers */
.section-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.25rem 0 0.25rem;
}
.section-title {
  color: var(--main-title-color);
  font-size: 1.4rem;
  font-weight: 900;
  margin: 0;
  text-shadow: var(--main-title-shadow);
}
.section-count {
  color: var(--main-text-soft);
  font-weight: 700;
}
.tools-head { margin-top: 1.5rem; }

/* =========================
   Activity cards — ACTIVITIES tokens
   ========================= */
.tb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;

  --badge-inset: 12px;
  --badge-height: 1.7rem;
  --badge-pad-x: 0.9rem;
  --badge-radius: 999px;
  --badge-font: 0.95rem;
}

.tb-card {
  position: relative;
  border: 3px solid var(--activities-border);
  border-radius: var(--radius-md);
  background: var(--activities-surface);
  box-shadow: var(--activities-shadow);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  text-align: center;
  color: var(--activities-on-surface);
}
.tb-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--elevation-2);
  border-color: color-mix(in srgb, var(--activities-accent) 50%, var(--activities-border) 50%);
  z-index: 2;
}
@media (prefers-reduced-motion: reduce) {
  .tb-card { transition: border-color 0.18s ease; }
  .tb-card:hover { transform: none; }
}

/* Corner badges */
.corner-rail {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
}
.corner { position: absolute; top: var(--badge-inset); pointer-events: none; z-index: 3; }
.corner.tl { left: var(--badge-inset); }
.corner.tr { right: var(--badge-inset); }

.corner.new span,
.corner.xp span {
  position: relative;
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
  box-shadow:
    0 8px 16px rgba(0, 0, 0, 0.14),
    inset 0 -2px 0 rgba(255, 255, 255, 0.22);
  border: 1px solid var(--activities-border);
  color: var(--activities-on-surface);
}
/* Accents for badges */
.corner.new span {
  background: var(--activities-chip-new);
  border-color: color-mix(in srgb, var(--activities-chip-new) 65%, #000 35%);
}
.corner.xp span {
  background: var(--activities-chip-xp);
  border-color: color-mix(in srgb, var(--activities-chip-xp) 65%, #000 35%);
}

/* Media */
.cover {
  aspect-ratio: 1 / 1;
  background: transparent;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-top-left-radius: var(--radius-md);
  border-top-right-radius: var(--radius-md);
}
.cover img { width: 100%; height: 100%; object-fit: contain; }
.cover-fallback {
  width: 100%; height: 100%;
  display: grid; place-items: center;
  padding: 0.75rem;
  text-align: center;
  color: var(--main-text-soft);
  background: var(--neutral-100);
}
.cover-fallback-title {
  font-weight: 800; line-height: 1.2; color: var(--activities-on-surface);
}

.tb-body { padding: 0.75rem 0.9rem 1rem; }
.tb-title {
  margin: 0 0 0.4rem;
  font-size: 1.18rem;
  font-weight: 800;
  color: var(--activities-on-surface);
}

/* Chips (use Activities chip tokens) */
.chip-row { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.chip {
  display: inline-flex; align-items: center;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.85rem;
  border: 1px solid var(--activities-border);
  background: var(--activities-chip-bg);
  color: var(--activities-chip-on);
}

/* =========================
   Responsive / Mobile Condensed
   ========================= */
@media (max-width: 1280px) {
  .page { padding-left: 8vw; padding-right: 8vw; }
}
@media (max-width: 900px) {
  .page { padding-left: 5vw; padding-right: 5vw; }
  .tb-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
  .tb-title { font-size: 1.05rem; }
}
@media (max-width: 640px) {
  .page { padding-left: 1rem; padding-right: 1rem; padding-top: 1rem; padding-bottom: 2rem; }
  .title { font-size: 1.5rem; }
  .tb-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
    --badge-inset: 8px;
    --badge-height: 1.4rem;
    --badge-pad-x: 0.6rem;
    --badge-font: 0.8rem;
  }
  .tb-card { border-radius: var(--radius-sm); }
  .cover { border-top-left-radius: var(--radius-sm); border-top-right-radius: var(--radius-sm); }
  .tb-body { padding: 0.6rem 0.6rem 0.8rem; }
  .tb-title { font-size: 1rem; margin-bottom: 0.3rem; }
  .chip { font-size: 0.78rem; padding: 0.12rem 0.5rem; }
}
@media (max-width: 420px) {
  .tb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .tb-title { font-size: 0.95rem; }
  .chip { font-size: 0.75rem; }
}
</style>


