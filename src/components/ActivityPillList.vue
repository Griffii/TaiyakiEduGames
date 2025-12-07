<template>
    <section class="apl-root">
        <div class="apl-inner">
            <!-- Status states -->
            <p v-if="loading" class="apl-muted">Loading activities…</p>
            <p v-else-if="error" class="apl-error">{{ error }}</p>

            <template v-else>
                <p v-if="!hasAny" class="apl-muted apl-center">
                    No activities found.
                </p>

                <div v-else class="apl-sections">
                    <!-- Order: activities then tools -->
                    <template v-if="order === 'activities-first'">
                        <!-- Activities (Games) -->
                        <section v-if="showActivities && regularActivities.length" class="apl-section">
                            <header v-if="showSectionTitles" class="apl-section-head">
                                <h2 class="apl-section-title">Games</h2>
                                <span class="apl-section-count">
                                    ({{ regularActivities.length }})
                                </span>
                            </header>

                            <ul class="apl-list">
                                <li v-for="a in regularActivities" :key="a.id">
                                    <button type="button" class="apl-pill" :class="{
                                        'apl-pill--xp': isXp(a),
                                        'apl-pill--new': isNew(a)
                                    }" @click="openActivity(a)">
                                        <!-- NEW / XP chips -->
                                        <span v-if="isNew(a) || isXp(a)" class="apl-chip-row">
                                            <span v-if="isNew(a)" class="apl-new-badge">NEW</span>
                                            <span v-if="isXp(a)" class="apl-xp-badge">XP</span>
                                        </span>

                                        <span class="apl-icon-wrap">
                                            <img v-if="iconUrl(a)" :src="iconUrl(a)" :alt="a.name" class="apl-icon"
                                                loading="lazy" decoding="async" @error.stop="onIconError(a.id)" />
                                            <span v-else class="apl-icon-fallback">
                                                {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                            </span>
                                        </span>
                                        <span class="apl-pill-text">
                                            {{ a.name }}
                                        </span>
                                    </button>
                                </li>
                            </ul>
                        </section>

                        <!-- Teacher Tools -->
                        <section v-if="showTools && teacherTools.length" class="apl-section">
                            <header v-if="showSectionTitles" class="apl-section-head">
                                <h2 class="apl-section-title">Teacher Tools</h2>
                                <span class="apl-section-count">
                                    ({{ teacherTools.length }})
                                </span>
                            </header>

                            <ul class="apl-list">
                                <li v-for="a in teacherTools" :key="a.id">
                                    <button type="button" class="apl-pill apl-pill--tool" :class="{
                                        'apl-pill--xp': isXp(a),
                                        'apl-pill--new': isNew(a)
                                    }" @click="openActivity(a)">
                                        <!-- NEW / XP chips -->
                                        <span v-if="isNew(a) || isXp(a)" class="apl-chip-row">
                                            <span v-if="isNew(a)" class="apl-new-badge">NEW</span>
                                            <span v-if="isXp(a)" class="apl-xp-badge">XP</span>
                                        </span>

                                        <span class="apl-icon-wrap">
                                            <img v-if="iconUrl(a)" :src="iconUrl(a)" :alt="a.name" class="apl-icon"
                                                loading="lazy" decoding="async" @error.stop="onIconError(a.id)" />
                                            <span v-else class="apl-icon-fallback">
                                                {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                            </span>
                                        </span>

                                        <span class="apl-pill-text">
                                            {{ a.name }}
                                        </span>
                                    </button>

                                </li>
                            </ul>
                        </section>
                    </template>

                    <!-- Order: tools then activities -->
                    <template v-else>
                        <!-- Teacher Tools -->
                        <section v-if="showTools && teacherTools.length" class="apl-section">
                            <header v-if="showSectionTitles" class="apl-section-head">
                                <h2 class="apl-section-title">Teacher Tools</h2>
                                <span class="apl-section-count">
                                    ({{ teacherTools.length }})
                                </span>
                            </header>

                            <ul class="apl-list">
                                <li v-for="a in teacherTools" :key="a.id">
                                    <button type="button" class="apl-pill apl-pill--tool" :class="{
                                        'apl-pill--xp': isXp(a),
                                        'apl-pill--new': isNew(a)
                                    }" @click="openActivity(a)">
                                        <!-- Tiny NEW badge -->
                                        <span v-if="isNew(a)" class="apl-new-badge">
                                            NEW
                                        </span>

                                        <span class="apl-icon-wrap">
                                            <img v-if="iconUrl(a)" :src="iconUrl(a)" :alt="a.name" class="apl-icon"
                                                loading="lazy" decoding="async" @error.stop="onIconError(a.id)" />
                                            <span v-else class="apl-icon-fallback">
                                                {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                            </span>
                                        </span>
                                        <span class="apl-pill-text">
                                            {{ a.name }}
                                        </span>
                                    </button>
                                </li>
                            </ul>
                        </section>

                        <!-- Activities (Games) -->
                        <section v-if="showActivities && regularActivities.length" class="apl-section">
                            <header v-if="showSectionTitles" class="apl-section-head">
                                <h2 class="apl-section-title">Games</h2>
                                <span class="apl-section-count">
                                    ({{ regularActivities.length }})
                                </span>
                            </header>

                            <ul class="apl-list">
                                <li v-for="a in regularActivities" :key="a.id">
                                    <button type="button" class="apl-pill" :class="{
                                        'apl-pill--xp': isXp(a),
                                        'apl-pill--new': isNew(a)
                                    }" @click="openActivity(a)">
                                        <!-- NEW / XP chips -->
                                        <span v-if="isNew(a) || isXp(a)" class="apl-chip-row">
                                            <span v-if="isNew(a)" class="apl-new-badge">NEW</span>
                                            <span v-if="isXp(a)" class="apl-xp-badge">XP</span>
                                        </span>

                                        <span class="apl-icon-wrap">
                                            <img v-if="iconUrl(a)" :src="iconUrl(a)" :alt="a.name" class="apl-icon"
                                                loading="lazy" decoding="async" @error.stop="onIconError(a.id)" />
                                            <span v-else class="apl-icon-fallback">
                                                {{ a.name?.charAt(0)?.toUpperCase() || '?' }}
                                            </span>
                                        </span>
                                        <span class="apl-pill-text">
                                            {{ a.name }}
                                        </span>
                                    </button>
                                </li>
                            </ul>
                        </section>
                    </template>
                </div>
            </template>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, withDefaults } from 'vue'
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

const props = withDefaults(
    defineProps<{
        show?: 'activities' | 'tools' | 'both'
        order?: 'activities-first' | 'tools-first'
        showSectionTitles?: boolean
    }>(),
    {
        show: 'both',
        order: 'activities-first',
        showSectionTitles: true
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
    return (
        tags.includes('teacher tool') ||
        tags.includes('teacher-tool') ||
        tags.includes('teachertool')
    )
}

function isXp(a: Activity): boolean {
    const tags = normTags(a)
    return (
        tags.includes('xp') ||
        tags.includes('XP') ||
        tags.includes('gives_xp') ||
        tags.includes('givesxp') ||
        tags.includes('experience')
    )
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
                .select(
                    'id, slug, name, type, url_path, external_url, icon_url, thumbnail_url, tags, status, archived_at'
                )
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
    activities.value.slice().sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
    )
)

const teacherTools = computed(() =>
    activitiesSorted.value.filter(a => isTeacherTool(a))
)
const regularActivities = computed(() =>
    activitiesSorted.value.filter(a => !isTeacherTool(a))
)

const showActivities = computed(
    () => props.show === 'activities' || props.show === 'both'
)
const showTools = computed(
    () => props.show === 'tools' || props.show === 'both'
)

const hasAny = computed(() => {
    const actCount = showActivities.value ? regularActivities.value.length : 0
    const toolCount = showTools.value ? teacherTools.value.length : 0
    return actCount + toolCount > 0
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
    if (s.startsWith('//'))
        return (window.location?.protocol || 'https:') + s

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
/* =========================
   Root container
   ========================= */

.apl-root {
    width: 100%;
    color: var(--activities-on-surface);
}

.apl-inner {
    padding: 0.4rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Text utilities */
.apl-muted {
    color: var(--main-text-soft);
    font-size: 0.9rem;
}

.apl-error {
    color: var(--accent-danger);
    font-weight: 600;
}

.apl-center {
    text-align: center;
}

/* Sections wrapper */
.apl-sections {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

/* Each section is its own little card using AppHeader tokens */
.apl-section {
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
.apl-section-head {
    display: inline-flex;
    align-items: baseline;
    gap: 0.35rem;
    padding: 0 0.15rem 0.1rem;
}

.apl-section-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--header-on-surface);
}

.apl-section-count {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--main-text-soft);
}

/* =========================
   Vertical list + pills
   ========================= */

.apl-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.apl-pill {
    --pill-border: var(--activities-border);

    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;

    width: 100%;
    padding: 0.4rem 0.7rem 0.4rem 0.4rem;

    border-radius: 999px;
    border: 2px solid var(--pill-border);
    background: var(--activities-surface);

    color: var(--activities-on-surface);
    font-weight: 700;
    font-size: 0.95rem;
    line-height: 1.2;

    cursor: pointer;
    text-align: left;

    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.24);
    transition:
        transform 0.16s ease,
        box-shadow 0.16s ease,
        border-color 0.16s ease,
        background-color 0.16s ease;
}

.apl-pill--tool {
    /* Slight tweak for tools (a bit lighter/different) */
    background: color-mix(in srgb,
            var(--activities-surface) 82%,
            var(--neutral-100) 18%);
}

.apl-pill:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.28);
    border-color: color-mix(in srgb,
            var(--accent-primary) 60%,
            var(--activities-border) 40%);
}

.apl-pill:active {
    transform: translateY(0);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* NEW / XP states just mark the pill; actual visuals are chips */
.apl-pill--new,
.apl-pill--xp {
    position: relative;
    overflow: visible;
}

/* =========================
   NEW + XP chips (top-right)
   ========================= */

/* Container for both chips, positioned like the old NEW badge */
.apl-chip-row {
    position: absolute;
    top: -0.5rem;
    right: 0.5rem;
    display: inline-flex;
    gap: 0.25rem;
    pointer-events: none;
    /* clicks still hit the button */
}

/* Shared chip style */
.apl-new-badge,
.apl-xp-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    padding: 0.05rem 0.45rem 0.15rem;
    border-radius: 999px;

    font-size: 0.6rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.22);
}

/* NEW chip – same look as before */
.apl-new-badge {
    border: 2px solid color-mix(in srgb,
            var(--accent-warning) 70%,
            var(--accent-danger) 30%);
    background: color-mix(in srgb,
            var(--accent-warning) 70%,
            var(--neutral-0) 30%);
    color: #3a2100;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
}

/* XP chip – blue variant in the same style */
.apl-xp-badge {
    border: 2px solid color-mix(in srgb,
            var(--activities-chip-xp) 70%,
            #000 30%);
    background: color-mix(in srgb,
            var(--activities-chip-xp) 75%,
            var(--neutral-0) 25%);
    color: var(--activities-on-surface);
}

/* Icon bubble */
.apl-icon-wrap {
    flex: 0 0 auto;
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 999px;
    border: 2px solid color-mix(in srgb,
            var(--activities-border) 60%,
            #000 40%);
    background: radial-gradient(circle at 30% 20%,
            rgba(255, 255, 255, 0.32),
            transparent 55%);
    display: grid;
    place-items: center;
    overflow: hidden;
}

.apl-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.apl-icon-fallback {
    font-weight: 800;
    font-size: 1rem;
    color: var(--activities-on-surface);
}

/* Pill text */
.apl-pill-text {
    flex: 1 1 auto;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* =========================
   Responsive
   ========================= */

@media (max-width: 640px) {
    .apl-inner {
        padding: 0.35rem 0;
    }

    .apl-section {
        padding: 0.45rem 0.5rem 0.55rem;
    }

    .apl-pill {
        padding: 0.35rem 0.6rem 0.35rem 0.35rem;
        font-size: 0.9rem;
    }

    .apl-icon-wrap {
        width: 1.9rem;
        height: 1.9rem;
    }

    .apl-section-title {
        font-size: 0.9rem;
    }

    .apl-section-count {
        font-size: 0.8rem;
    }

    /* Keep chip position consistent on small screens,
     same offset as your old NEW badge */
    .apl-chip-row {
        top: -0.45rem;
        right: 0.35rem;
    }
}
</style>
