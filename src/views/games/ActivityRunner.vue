<!-- src/views/games/ActivityRunner.vue -->
<template>
  <div class="page activity-runner">
    <!-- Title (from activities.name) -->
    <header class="head title-head">
      <h1 class="title">{{ title }}</h1>
    </header>

    <main class="content runner-content">
      <!-- Game Frame -->
      <div class="frame-wrap" ref="frameWrap">
        <template v-if="iframeSrc">
          <iframe
            ref="frameEl"
            :src="iframeSrc"
            title=""
            allow="fullscreen; autoplay; gamepad"
            allowfullscreen
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups"
            @load="onFrameLoad"
          ></iframe>
        </template>
        <template v-else>
          <div class="empty">
            <p class="muted">
              {{ loading ? 'Loading activity…' : (error || 'No external URL configured for this activity.') }}
            </p>
          </div>
        </template>
      </div>

      <!-- Under-frame actions -->
      <div class="under-actions">
        <button class="btn primary" @click="requestFullscreen">
          Go Fullscreen
        </button>
      </div>

      <!-- Tags -->
      <section v-if="tags.length" class="tags">
        <div class="chips">
          <span v-for="t in tags" :key="t" class="chip"># {{ t }}</span>
        </div>
      </section>

      <!-- Achievements (placeholder) -->
      <section class="achievements">
        <h2 class="section-title">Achievements</h2>
        <div class="badges">
          <div class="badge locked">
            <div class="icon" aria-hidden="true">🏆</div>
            <div class="label">Locked</div>
          </div>
          <div class="badge locked">
            <div class="icon" aria-hidden="true">⭐</div>
            <div class="label">Locked</div>
          </div>
          <div class="badge locked">
            <div class="icon" aria-hidden="true">🎯</div>
            <div class="label">Locked</div>
          </div>
          <div class="badge locked">
            <div class="icon" aria-hidden="true">⏱️</div>
            <div class="label">Locked</div>
          </div>
        </div>
        <small class="muted note">Achievement tracking coming soon.</small>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">

import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/lib/supabase';
import type { PostgrestMaybeSingleResponse } from '@supabase/supabase-js'



type DBActivity = {
  id: string
  slug: string
  name: string
  type: string | null
  url_path: string | null
  external_url: string | null
  icon_url: string | null
  thumbnail_url: string | null
  tags: string[] | null
  launch_params: Record<string, any> | null
  status: 'draft' | 'published' | 'archived'
  archived_at: string | null
}

type MetaActivity = Partial<Pick<DBActivity,'slug'|'name'|'external_url'|'url_path'|'tags'>> & { title?: string }

const route = useRoute()
const frameEl = ref<HTMLIFrameElement | null>(null)
const frameWrap = ref<HTMLElement | null>(null)


const GAMES_BASE = (import.meta.env.VITE_GAMES_BASE as string) || 'https://games.eitake.app'

// Route params: support either /activities/:slug or /activities/:id
const routeSlug = computed(() => (route.params.slug as string | undefined))
const routeId = computed(() => (route.params.id as string | undefined))
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Meta fallback (if a parent set route.meta.activity)
const meta = (route.meta as Record<string, unknown>) ?? {}
const metaActivity = (meta.activity as MetaActivity | undefined) ?? undefined

// Local state from DB
const dbActivity = ref<DBActivity | null>(null)
const loading = ref<boolean>(false)
const error = ref<string | null>(null)

// Fetch from DB by id or slug
async function loadActivity() {
  error.value = null
  dbActivity.value = null
  if (!supabase) {
    // No client configured; rely on meta/query fallbacks
    return
  }
  const key = routeId.value || routeSlug.value || metaActivity?.slug
  if (!key) return

  loading.value = true
  try {
    let resp: PostgrestMaybeSingleResponse<DBActivity>

if (uuidRegex.test(key)) {
  resp = await supabase
    .from('activities')
    .select('id,slug,name,type,url_path,external_url,icon_url,thumbnail_url,tags,launch_params,status,archived_at')
    .eq('id', key)
    .maybeSingle()
} else {
  resp = await supabase
    .from('activities')
    .select('id,slug,name,type,url_path,external_url,icon_url,thumbnail_url,tags,launch_params,status,archived_at')
    .eq('slug', key)
    .maybeSingle()
}

if (resp.error) throw resp.error
dbActivity.value = resp.data ?? null

    if (!dbActivity.value) {
      error.value = 'Activity not found.'
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load activity.'
  } finally {
    loading.value = false
  }
}

onMounted(loadActivity)
watch([routeSlug, routeId], () => loadActivity())

/** Fallback tags from query (?tags=a,b,c) if DB/meta lack tags */
function parseQueryTags(): string[] {
  const q = route.query?.tags
  if (!q) return []
  if (Array.isArray(q)) return q.flatMap(s => String(s).split(',')).map(s => s.trim()).filter(Boolean)
  return String(q).split(',').map(s => s.trim()).filter(Boolean)
}

/** Title: prefer DB name → meta name/title → slug prettified */
const title = computed(() =>
  dbActivity.value?.name
  ?? metaActivity?.name
  ?? (metaActivity?.title || undefined)
  ?? (routeSlug.value ? routeSlug.value.replace(/-/g, ' ') : 'Activity')
)

/** Tags: prefer DB tags → meta tags → query tags */
const tags = computed<string[]>(() =>
  (dbActivity.value?.tags ?? metaActivity?.tags ?? parseQueryTags() ?? [])
    .filter(Boolean)
)

/** Absolute URL normalizer with trailing slash for folders */
function toAbsoluteExternal(raw?: string | null): string {
  if (!raw) return ''
  let s = String(raw).trim()
  if (!s) return ''

  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(s)) return s     // http(s)...
  if (/^[a-z][a-z0-9+\-.]*:/i.test(s)) return s         // other schemes
  if (s.startsWith('//')) return (window.location?.protocol || 'https:') + s
  if (/^[\w.-]+\.[a-z]{2,}([/:?#]|$)/i.test(s)) s = 'https://' + s

  try {
    const u = new URL(s, window.location.origin)
    const last = (u.pathname.split('/').pop() || '')
    const hasExt = /\.[a-z0-9]+$/i.test(last)
    if (!hasExt && !u.search && !u.hash && !u.pathname.endsWith('/')) u.pathname += '/'
    return u.toString()
  } catch {
    return s
  }
}

/** Slug for fallback URL derivation */
const effectiveSlug = computed(() =>
  dbActivity.value?.slug || routeSlug.value || metaActivity?.slug || 'activity'
)

/** iframe URL priority:
 *  1) DB external_url
 *  2) meta external_url
 *  3) ?url= query
 *  4) derived from slug + GAMES_BASE
 */
const rawExternal = computed(() =>
  dbActivity.value?.external_url
    ?? metaActivity?.external_url
    ?? (route.query.url as string | undefined)
    ?? `${GAMES_BASE.replace(/\/+$/, '')}/${effectiveSlug.value}/`
)
const iframeSrc = computed(() => toAbsoluteExternal(rawExternal.value))

/** postMessage handshake restrictions */
function originOf(url: string): string | null {
  try { return new URL(url).origin } catch { return null }
}
const ALLOWED_CHILD_ORIGINS = new Set([
  'https://games.eitake.app',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
])
const childOrigin = computed(() => {
  const o = originOf(iframeSrc.value)
  return o && ALLOWED_CHILD_ORIGINS.has(o) ? o : null
})

function onFrameLoad() {
  if (!childOrigin.value) return
  const payload = {
    version: '1.0.0',
    activity_id: dbActivity.value?.id || effectiveSlug.value,
    slug: dbActivity.value?.slug || effectiveSlug.value,
  }
  frameEl.value?.contentWindow?.postMessage({ type: 'parent:init', payload }, childOrigin.value)
}

type ChildMessage =
  | { type: 'child:ready'; payload?: any }
  | { type: 'xp:award'; payload: { amount: number; reason?: string } }
  | { type: 'track:event'; payload: { name: string; props?: Record<string, any> } }
  | { type: 'request:fullscreen'; payload?: any }

function onMessage(e: MessageEvent<ChildMessage>) {
  if (!childOrigin.value || e.origin !== childOrigin.value) return
  const { type, payload } = e.data || {}
  if (type === 'request:fullscreen') requestFullscreen()
  if (type === 'xp:award') console.info('[ActivityRunner] xp:award', payload)
  if (type === 'track:event') console.info('[ActivityRunner] track:event', payload)
}

function requestFullscreen() {
  const target: any = frameEl.value || frameWrap.value || document.documentElement
  const req = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen
  if (req) req.call(target)
}

onMounted(() => window.addEventListener('message', onMessage as any))
onBeforeUnmount(() => window.removeEventListener('message', onMessage as any))
</script>

<style scoped>
/* Page layout */
.title-head {
  display: flex;
  justify-content: center;
  align-items: center;
  /* more space before iframe per request */
  padding: 1.25rem 0 2.25rem;
}
.title-head .title {
  color: #fff;
  text-align: center;
  margin: 0;
  line-height: 1.2;
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  font-weight: 700;
}

.runner-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem 0;
  padding-bottom: 2rem;
}

/* Frame wrapper: centered, 16:9, ~80% width (max 1200px) */
.frame-wrap {
  position: relative;
  width: min(80vw, 1200px);
  aspect-ratio: 16 / 9;
  background: #0f0f10;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid rgba(255,255,255,0.18);
  box-shadow: 0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04) inset;
}

/* iFrame fills the wrapper */
iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}

/* Buttons */
.btn {
  appearance: none;
  border: none;
  outline: none;
  padding: 0.7rem 1.05rem;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .06s ease, box-shadow .2s ease, filter .15s ease;
}
.btn.primary {
  background: #22c55e;               /* filled color */
  color: #06110a;
  box-shadow: 0 6px 16px rgba(34, 197, 94, 0.35);
}
.btn.primary:hover { filter: brightness(1.06); }
.btn.primary:active { transform: translateY(1px) scale(0.995); }
.btn.primary:focus-visible {
  box-shadow: 0 0 0 3px rgba(34,197,94,0.35), 0 6px 16px rgba(34, 197, 94, 0.35);
}

/* Under-frame actions */
.under-actions {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* Tags as chips */
.tags {
  width: min(80vw, 1200px);
  margin-top: 0.25rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
.chip {
  font-size: .85rem;
  line-height: 1;
  padding: .5rem .65rem;
  border-radius: 999px;
  color: #e7eefc;
  background: rgba(64, 129, 255, 0.18);
  border: 1px solid rgba(64, 129, 255, 0.35);
  user-select: none;
}

/* Achievements placeholder */
.achievements {
  width: min(80vw, 1200px);
  margin-top: .5rem;
}
.section-title {
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 .5rem 0;
}
.badges {
  display: grid;
  grid-template-columns: repeat( auto-fit, minmax(120px, 1fr) );
  gap: .75rem;
}
.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: .75rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  min-height: 100px;
}
.badge .icon {
  font-size: 1.6rem;
  margin-bottom: .35rem;
}
.badge .label {
  font-size: .85rem;
  color: #cfd6e6;
}
.badge.locked { opacity: 0.78; }
.note {
  display: block;
  margin-top: .35rem;
  color: #9aa3b2;
}

/* Empty state */
.empty {
  display: flex; align-items: center; justify-content: center;
  height: 100%; color: #888;
}
</style>
