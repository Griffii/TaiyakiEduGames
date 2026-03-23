<template>
  <section class="vng-root" :style="rootStyle" aria-label="Visual novels icon grid">
    <p v-if="loading" class="vng-muted">Loading…</p>
    <p v-else-if="error" class="vng-error">{{ error }}</p>

    <div v-else class="vng-scroll" role="list">
      <article
        v-for="vn in novels"
        :key="vn.slug"
        class="vng-item"
        role="listitem"
      >
        <button
          class="vng-cardBtn"
          type="button"
          :title="vn.title"
          @click="openNovel(vn)"
          @keydown.enter.prevent="openNovel(vn)"
          @keydown.space.prevent="openNovel(vn)"
        >
          <div class="vng-card">
            <div class="vng-cover">
              <img
                v-if="coverUrl(vn)"
                :src="coverUrl(vn)"
                :alt="vn.title"
                loading="lazy"
                decoding="async"
                draggable="false"
                @error.stop="onImageError(vn.slug)"
              />
              <div v-else class="vng-coverFallback" aria-hidden="true">
                <span class="vng-coverFallbackTitle">{{ vn.title }}</span>
              </div>
            </div>

            <div class="vng-body">
              <div class="vng-name">{{ vn.title }}</div>

              <div class="vng-stats" aria-label="Visual novel stats">
                <span class="vng-stat" title="Views">
                  <svg viewBox="0 0 24 24" class="vng-statIcon" aria-hidden="true">
                    <path
                      d="M12 5c5.5 0 9.5 4.5 10.7 6-1.2 1.5-5.2 6-10.7 6S2.5 12.5 1.3 11C2.5 9.5 6.5 5 12 5Zm0 2C8.1 7 5 9.8 3.5 11 5 12.2 8.1 15 12 15s7-2.8 8.5-4C19 9.8 15.9 7 12 7Zm0 1.5A2.5 2.5 0 1 1 9.5 11 2.5 2.5 0 0 1 12 8.5Z"
                    />
                  </svg>
                  <span>{{ vn.views_count }}</span>
                </span>

                <span class="vng-stat" title="Likes">
                  <svg viewBox="0 0 24 24" class="vng-statIcon" aria-hidden="true">
                    <path
                      d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.5A4.5 4.5 0 0 1 6.5 4 5 5 0 0 1 12 7.09 5 5 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.59-3.4 6.74-8.55 11.5L12 21.35Z"
                    />
                  </svg>
                  <span>{{ vn.likes_count }}</span>
                </span>

                <span class="vng-stat" title="Comments">
                  <svg viewBox="0 0 24 24" class="vng-statIcon" aria-hidden="true">
                    <path
                      d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9h2v1.17L8.71 15H20V6Z"
                    />
                  </svg>
                  <span>{{ vn.comments_count }}</span>
                </span>
              </div>
            </div>
          </div>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { withLoading } from '@/utils/withLoading'

type VisualNovel = {
  slug: string
  title: string
  cover_image_url?: string | null
  views_count: number
  likes_count: number
  comments_count: number
}

const props = withDefaults(
  defineProps<{
    width?: string
    height?: string
    cardWidth?: number
    coverAspect?: string
    titleLines?: number
    gap?: number
    limit?: number
  }>(),
  {
    width: '100%',
    height: '340px',
    cardWidth: 180,
    coverAspect: '16 / 9',
    titleLines: 2,
    gap: 14,
    limit: 8,
  }
)

const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const novels = ref<VisualNovel[]>([])
const failedImages = ref<Set<string>>(new Set())

onMounted(async () => {
  await withLoading(async () => {
    try {
      const { data, error: e } = await supabase
        .from('visual_novels')
        .select(`
          slug,
          title,
          cover_image_url,
          visual_novel_stats (
            views_count,
            likes_count,
            comments_count
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(props.limit)

      if (e) throw e

      novels.value = (data || []).map((row: any) => {
        const stats = Array.isArray(row.visual_novel_stats)
          ? row.visual_novel_stats[0] || {}
          : row.visual_novel_stats || {}

        return {
          slug: row.slug,
          title: row.title,
          cover_image_url: row.cover_image_url,
          views_count: Number(stats.views_count || 0),
          likes_count: Number(stats.likes_count || 0),
          comments_count: Number(stats.comments_count || 0),
        }
      })
    } catch (e: any) {
      console.error(e)
      error.value = e?.message ?? String(e)
    } finally {
      loading.value = false
    }
  }, 250)
})

function coverUrl(vn: VisualNovel): string {
  if (failedImages.value.has(vn.slug)) return ''
  return vn.cover_image_url || ''
}

function onImageError(slug: string) {
  failedImages.value.add(slug)
}

function openNovel(vn: VisualNovel) {
  router.push(`/visual-novels/${vn.slug}`)
}

const safeGap = computed(() => Math.max(8, Math.min(24, Math.floor(props.gap || 14))))
const safeCardWidth = computed(() => Math.max(150, Math.min(260, Math.floor(props.cardWidth || 180))))

const rootStyle = computed(() => ({
  width: props.width,
  height: props.height,
  '--vng-gap': `${safeGap.value}px`,
  '--vng-card-min': `${safeCardWidth.value}px`,
  '--vng-lines': String(props.titleLines),
  '--vng-cover-aspect': props.coverAspect,
}))
</script>

<style scoped>
.vng-root {
  display: grid;
  grid-template-rows: auto;
  height: 100%;
  min-height: 0;
  overflow: visible;
}

.vng-muted {
  color: var(--main-text-soft);
  margin: 0;
  padding: 0.75rem 1rem;
}

.vng-error {
  color: var(--accent-danger);
  margin: 0;
  padding: 0.75rem 1rem;
}

.vng-scroll {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: visible;

  display: grid;
  gap: var(--vng-gap);
  grid-template-columns: repeat(auto-fill, minmax(var(--vng-card-min), 1fr));
  align-content: start;

  padding: 14px 16px 18px;
}

.vng-item {
  display: grid;
  overflow: visible;
}

.vng-cardBtn {
  all: unset;
  cursor: pointer;
  display: block;
  overflow: visible;
}

.vng-cardBtn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--activities-accent) 60%, transparent 40%);
  outline-offset: 3px;
  border-radius: var(--radius-md);
}

.vng-card {
  position: relative;
  border: 3px solid var(--activities-border);
  border-radius: var(--radius-md);
  background: var(--activities-surface);
  box-shadow: var(--activities-shadow);
  overflow: hidden;
  color: var(--activities-on-surface);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.vng-cardBtn:hover .vng-card {
  transform: translateY(-4px);
  box-shadow: var(--elevation-2);
  border-color: color-mix(in srgb, var(--activities-accent) 50%, var(--activities-border) 50%);
}

@media (prefers-reduced-motion: reduce) {
  .vng-card {
    transition: border-color 0.18s ease;
  }

  .vng-cardBtn:hover .vng-card {
    transform: none;
  }
}

.vng-cover {
  aspect-ratio: var(--vng-cover-aspect);
  background: transparent;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-top-left-radius: var(--radius-md);
  border-top-right-radius: var(--radius-md);
}

.vng-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.vng-coverFallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  padding: 0.75rem;
  text-align: center;
  color: var(--main-text-soft);
  background: var(--neutral-100);
}

.vng-coverFallbackTitle {
  font-weight: 800;
  line-height: 1.2;
  color: var(--activities-on-surface);
}

.vng-body {
  display: grid;
  gap: 0.55rem;
  padding: 0.75rem 0.9rem 0.85rem;
  background: #fff;
  color: #1f2937;
}

.vng-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 850;
  line-height: 1.18;
  color: var(--activities-on-surface);

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--vng-lines);
  line-clamp: var(--vng-lines);
  overflow: hidden;
}

.vng-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  padding-top: 0.35rem;
  border-top: 1px solid #e5e7eb;
}

.vng-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: #4b5563;
  min-width: 0;
}

.vng-statIcon {
  width: 14px;
  height: 14px;
  fill: currentColor;
  flex: 0 0 auto;
}

@media (max-width: 640px) {
  .vng-scroll {
    grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
    gap: 10px;
    padding: 12px 14px 16px;
  }

  .vng-body {
    padding: 0.65rem 0.7rem 0.75rem;
  }

  .vng-name {
    font-size: 0.92rem;
  }

  .vng-stat {
    font-size: 0.72rem;
  }

  .vng-statIcon {
    width: 13px;
    height: 13px;
  }
}
</style>