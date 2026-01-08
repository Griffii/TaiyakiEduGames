<!-- src/components/ActivitiesIconGrid.vue -->
<template>
  <section class="ais-root" :style="rootStyle" aria-label="Activities icon grid">
    <p v-if="loading" class="ais-muted">Loading…</p>
    <p v-else-if="error" class="ais-error">{{ error }}</p>

    <!-- Vertical scroll container; grid wraps by width automatically -->
    <div v-else class="ais-scroll" role="list">
      <article
        v-for="a in filteredActivities"
        :key="a.id"
        class="ais-item"
        role="listitem"
      >
        <!-- Chips: always above icon, pinned to tile -->
        <div class="ais-badges" aria-hidden="true">
          <span v-if="isXp(a)" class="ais-badge ais-badge--xp">XP</span>
          <span v-if="isNew(a)" class="ais-badge ais-badge--new">NEW</span>
        </div>

        <!-- icon (ONLY the icon is interactive/hoverable) -->
        <button
          class="ais-iconBtn"
          type="button"
          :title="a.name"
          @click="openActivity(a)"
          @keydown.enter.prevent="openActivity(a)"
          @keydown.space.prevent="openActivity(a)"
        >
          <div class="ais-icon">
            <img
              v-if="iconUrl(a)"
              :src="iconUrl(a)"
              :alt="a.name"
              loading="lazy"
              decoding="async"
              draggable="false"
              @error.stop="onIconError(a.id)"
            />
            <div v-else class="ais-icon-fallback" aria-hidden="true"></div>
          </div>
        </button>

        <!-- title (not hoverable/clickable) -->
        <div class="ais-name">{{ a.name }}</div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

type Mode = 'games' | 'tools' | 'both'

const props = withDefaults(
  defineProps<{
    mode?: Mode
    width?: string
    height?: string
    iconSize?: number
    titleLines?: number
    gap?: number
  }>(),
  {
    mode: 'both',
    width: '100%',
    height: '260px',
    iconSize: 64,
    titleLines: 2,
    gap: 12,
  }
)

const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const activities = ref<Activity[]>([])
const failedIcons = ref<Set<string>>(new Set())

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

const sorted = computed(() =>
  activities.value.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
)

const filteredActivities = computed(() => {
  if (props.mode === 'both') return sorted.value
  if (props.mode === 'tools') return sorted.value.filter(isTeacherTool)
  return sorted.value.filter(a => !isTeacherTool(a))
})

function isHttpUrl(s?: string | null): boolean {
  return !!s && /^[a-z][a-z0-9+\-.]*:\/\//i.test(String(s).trim())
}

const ASSET_BUCKET = 'public-assets'
const ICONS_PREFIX = 'game-icons/'

function iconUrl(a: Activity): string {
  if (failedIcons.value.has(a.id)) return ''
  const raw = a.icon_url || a.thumbnail_url || ''
  if (!raw) return ''
  if (isHttpUrl(raw)) return raw

  let key = String(raw).replace(/^\/+/, '')
  if (!key.startsWith(ICONS_PREFIX)) key = ICONS_PREFIX + key
  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(key)
  return data?.publicUrl || ''
}

function onIconError(id: string) {
  failedIcons.value.add(id)
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
    if (!hasExt && !u.search && !u.hash && !u.pathname.endsWith('/')) u.pathname += '/'
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

const safeGap = computed(() => Math.max(6, Math.min(24, Math.floor(props.gap || 12))))

const rootStyle = computed(() => ({
  width: props.width,
  height: props.height,
  '--ais-icon-base': `${props.iconSize}px`,
  '--ais-lines': String(props.titleLines),
  '--ais-gap': `${safeGap.value}px`,
}))
</script>

<style scoped>
/* Root: no background, no border — just layout */
.ais-root {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

/* Status text */
.ais-muted { color: var(--main-text-soft); margin: 0; }
.ais-error { color: var(--accent-danger); margin: 0; }

/* Default 64px via prop, shrink on small screens */
.ais-root {
  --ais-icon: clamp(44px, 10vw, var(--ais-icon-base));
}

/* Vertical scroll container; wraps by width */
.ais-scroll {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;

  display: grid;
  gap: var(--ais-gap);

  grid-template-columns: repeat(auto-fill, minmax(calc(var(--ais-icon) + 34px), 1fr));
  align-content: start;

  padding: 2px;
}

/* Each tile */
.ais-item {
  position: relative;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 3px;            /* reduced gap icon <-> title */
  padding: 4px 2px 6px;
}

/* Chips pinned to the tile and always above icon */
.ais-badges {
  position: absolute;
  top: 2px;
  left: 6px;
  right: 6px;
  display: flex;
  justify-content: space-between;
  pointer-events: none;

  z-index: 5;          /* stays above icon even on hover */
}

.ais-badge {
  height: 16px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 1000;
  letter-spacing: 0.06em;
  line-height: 16px;
  border: 1px solid var(--activities-border);
  box-shadow:
    0 6px 10px rgba(0,0,0,0.12),
    inset 0 -1px 0 rgba(255,255,255,0.18);
  color: var(--activities-on-surface);
  white-space: nowrap;
}

.ais-badge--new {
  background: var(--activities-chip-new);
  border-color: color-mix(in srgb, var(--activities-chip-new) 65%, #000 35%);
}
.ais-badge--xp {
  background: var(--activities-chip-xp);
  border-color: color-mix(in srgb, var(--activities-chip-xp) 65%, #000 35%);
}

/* Only icon is interactive */
.ais-iconBtn {
  all: unset;
  cursor: pointer;
  display: inline-grid;
  place-items: center;
}
.ais-iconBtn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--activities-accent) 60%, transparent 40%);
  outline-offset: 3px;
}

/* Icon hover effect only */
.ais-icon {
  width: calc(var(--ais-icon) + 16px);
  height: calc(var(--ais-icon) + 16px);
  border-radius: 18px;
  border: 2px solid var(--activities-border);
  background: transparent;
  display: grid;
  place-items: center;
  overflow: hidden;

  position: relative;
  z-index: 1; /* below badges */

  transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
}

.ais-iconBtn:hover .ais-icon {
  transform: translateY(-2px);
  box-shadow: var(--elevation-1);
  border-color: color-mix(in srgb, var(--activities-accent) 50%, var(--activities-border) 50%);
}
@media (prefers-reduced-motion: reduce) {
  .ais-icon { transition: border-color 0.14s ease; }
  .ais-iconBtn:hover .ais-icon { transform: none; }
}

.ais-icon img {
  width: var(--ais-icon);
  height: var(--ais-icon);
  object-fit: contain;
  pointer-events: none;
}

.ais-icon-fallback {
  width: var(--ais-icon);
  height: var(--ais-icon);
  border-radius: 12px;
  background: color-mix(in srgb, var(--activities-border) 35%, transparent 65%);
}

/* Title (not hoverable/clickable) + vendorPrefix warning fix:
   add standard 'line-clamp' alongside -webkit-line-clamp.
*/
.ais-name {
  width: 100%;
  text-align: center;
  font-weight: 850;
  font-size: 0.86rem;
  line-height: 1.15;
  color: var(--activities-on-surface);

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--ais-lines);
  line-clamp: var(--ais-lines); /* standard property for compatibility */

  overflow: hidden;
}

/* Small screens: slightly smaller title */
@media (max-width: 640px) {
  .ais-name { font-size: 0.82rem; }
}
</style>
