<template>
  <section class="ghg-root" :style="rootStyle" aria-label="Games highlight grid">
    <div class="ghg-scroll" role="list">
      <article v-for="game in games" :key="game.slug" class="ghg-item" role="listitem">
        <component :is="game.type === 'internal' ? RouterLink : 'a'"
          :to="game.type === 'internal' ? game.href : undefined"
          :href="game.type === 'external' ? game.href : undefined"
          :target="game.type === 'external' ? '_blank' : undefined"
          :rel="game.type === 'external' ? 'noopener noreferrer' : undefined" class="ghg-cardBtn" :title="game.title"
          @mouseenter="playPreview(game.slug)" @mouseleave="stopPreview(game.slug)" @focus="playPreview(game.slug)"
          @blur="stopPreview(game.slug)">
          <div class="ghg-card">
            <div class="ghg-media">
              <img class="ghg-image" :src="game.image" :alt="`${game.title} preview image`" loading="lazy"
                decoding="async" draggable="false" />

              <video :ref="(el) => setVideoRef(el, game.slug)" class="ghg-video" :src="game.video" muted loop
                playsinline preload="metadata" />

              <div class="ghg-overlay" />

              <div v-if="game.platform" class="ghg-kicker">
                {{ game.platform }}
              </div>
            </div>

            <div class="ghg-body">
              <div class="ghg-title">
                {{ game.title }}
              </div>

              <p v-if="showDescription" class="ghg-description">
                {{ game.description }}
              </p>

              <div v-if="statsBySlug[game.slug]" class="ghg-stats" aria-label="Activity stats">
                <span class="ghg-stat" title="Likes">
                  <svg viewBox="0 0 24 24" class="ghg-statIcon" aria-hidden="true">
                    <path
                      d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.5A4.5 4.5 0 0 1 6.5 4 5 5 0 0 1 12 7.09 5 5 0 0 1 17.5 4 4.5 4.5 0 0 1 22 8.5c0 3.59-3.4 6.74-8.55 11.5L12 21.35Z" />
                  </svg>
                  <span>{{ statsBySlug[game.slug].likes_count }}</span>
                </span>

                <span class="ghg-stat" title="Comments">
                  <svg viewBox="0 0 24 24" class="ghg-statIcon" aria-hidden="true">
                    <path
                      d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v9h2v1.17L8.71 15H20V6Z" />
                  </svg>
                  <span>{{ statsBySlug[game.slug].comments_count }}</span>
                </span>
              </div>
            </div>
          </div>
        </component>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '@/lib/supabase'

/**
 * Assets image and video import list
 */
import typingTowerDefenceImage from '@/assets/images/screenshots/games/Leximancer-thumbnail-widescreen.png'
import typingTowerDefenceVideo from '@/assets/videos/Leximancer/Leximancer - Example_Video_01.mp4'

import pizzaImage from '@/assets/images/screenshots/games/PaP_01.png'
import pizzaVideo from '@/assets/videos/PaP/PaP-preview-short.mp4'

type GameCard = {
  slug: string
  title: string
  description: string
  platform?: string
  type: 'internal' | 'external'
  href: string
  image: string
  video: string
}

type ActivityStatsRow = {
  slug: string
  likes_count: number | null
  comments_count: number | null
}

const props = withDefaults(
  defineProps<{
    width?: string
    height?: string
    cardMinWidth?: number
    gap?: number
    showDescription?: boolean
  }>(),
  {
    width: '100%',
    height: '340px',
    cardMinWidth: 220,
    gap: 14,
    showDescription: true,
  }
)

const videoRefs = reactive<Record<string, HTMLVideoElement | null>>({})

const statsBySlug = ref<
  Record<
    string,
    {
      likes_count: number
      comments_count: number
    }
  >
>({})

import type { ComponentPublicInstance } from 'vue'

function setVideoRef(
  el: Element | ComponentPublicInstance | null,
  key: string
) {
  videoRefs[key] = el instanceof HTMLVideoElement ? el : null
}

async function playPreview(key: string) {
  const video = videoRefs[key]
  if (!video) return

  try {
    video.currentTime = 0
    await video.play()
  } catch {
    // ignore autoplay/playback errors
  }
}

function stopPreview(key: string) {
  const video = videoRefs[key]
  if (!video) return

  video.pause()
  video.currentTime = 0
}

const games: GameCard[] = [
  {
    slug: 'typing-tower-defence',
    title: 'Leximancer',
    description: 'Type words to defeat monsters and save the kingdom!',
    platform: 'NEW!',
    type: 'internal',
    href: '/activities/typing-tower-defence',
    image: typingTowerDefenceImage,
    video: typingTowerDefenceVideo,
  },
  {
    slug: 'pizzas-and-parfaits',
    title: 'Pizzas & Parfaits',
    description: 'Make pizzas/parfaits and earn as much money as fast as you can.',
    platform: '',
    type: 'internal',
    href: '/activities/pizzas-and-parfaits',
    image: pizzaImage,
    video: pizzaVideo,
  },
]

async function loadActivityStats() {
  const slugs = games.map(game => game.slug).filter(Boolean)

  if (!slugs.length) return

  const { data, error } = await supabase
    .from('activities_stats')
    .select('slug, likes_count, comments_count')
    .in('slug', slugs)

  if (error) {
    console.error('Failed to load highlight activity stats:', error)
    return
  }

  statsBySlug.value = Object.fromEntries(
    ((data || []) as ActivityStatsRow[]).map(row => [
      row.slug,
      {
        likes_count: Number(row.likes_count ?? 0),
        comments_count: Number(row.comments_count ?? 0),
      },
    ])
  )
}

onMounted(async () => {
  await loadActivityStats()
})

const safeGap = computed(() =>
  Math.max(8, Math.min(28, Math.floor(props.gap || 14)))
)

const safeCardMinWidth = computed(() =>
  Math.max(180, Math.min(320, Math.floor(props.cardMinWidth || 220)))
)

const rootStyle = computed(() => ({
  width: props.width,
  height: props.height,
  '--ghg-gap': `${safeGap.value}px`,
  '--ghg-card-min': `${safeCardMinWidth.value}px`,
}))
</script>

<style scoped>
.ghg-root {
  display: grid;
  grid-template-rows: auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: visible;
}

.ghg-scroll {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: visible;

  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--ghg-card-min), 1fr));
  gap: var(--ghg-gap);
  align-content: start;

  padding: 14px 16px 18px;
}

.ghg-item {
  display: grid;
  overflow: visible;
}

.ghg-cardBtn {
  all: unset;
  display: block;
  cursor: pointer;
  overflow: visible;
}

.ghg-cardBtn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--activities-accent) 60%, transparent 40%);
  outline-offset: 3px;
  border-radius: var(--radius-md);
}

.ghg-card {
  position: relative;
  border: 3px solid var(--activities-border);
  border-radius: var(--radius-md);
  background: var(--activities-surface);
  box-shadow: var(--activities-shadow);
  overflow: hidden;
  color: var(--activities-on-surface);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.ghg-cardBtn:hover .ghg-card,
.ghg-cardBtn:focus-visible .ghg-card {
  transform: translateY(-4px);
  box-shadow: var(--elevation-2);
  border-color: color-mix(in srgb, var(--activities-accent) 50%, var(--activities-border) 50%);
}

.ghg-media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #111827;
}

.ghg-image,
.ghg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ghg-image {
  z-index: 0;
  opacity: 1;
  transition: opacity 0.22s ease;
}

.ghg-video {
  z-index: 1;
  opacity: 0;
  transition: opacity 0.22s ease;
  pointer-events: none;
}

.ghg-cardBtn:hover .ghg-image,
.ghg-cardBtn:focus-visible .ghg-image {
  opacity: 0;
}

.ghg-cardBtn:hover .ghg-video,
.ghg-cardBtn:focus-visible .ghg-video {
  opacity: 1;
}

.ghg-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background:
    linear-gradient(to top,
      rgba(15, 23, 42, 0.32) 0%,
      rgba(15, 23, 42, 0.12) 36%,
      rgba(15, 23, 42, 0.06) 66%,
      rgba(15, 23, 42, 0.14) 100%);
  pointer-events: none;
}

.ghg-kicker {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: 30px;
  padding: 0.34rem 0.65rem;
  border-radius: 999px;

  font-size: 0.72rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;

  color: var(--activities-on-surface);
  background: color-mix(in srgb, var(--activities-surface) 88%, white 12%);
  border: 1px solid color-mix(in srgb, var(--activities-border) 70%, white 30%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.ghg-body {
  display: grid;
  gap: 0.5rem;
  padding: 0.8rem 0.9rem 0.9rem;
  background: var(--activities-surface);
}

.ghg-title {
  font-size: 1rem;
  font-weight: 850;
  line-height: 1.18;
  color: var(--activities-on-surface);

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.ghg-description {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--main-text-soft);

  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.ghg-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  padding-top: 0.35rem;
  border-top: 1px solid #e5e7eb;
}

.ghg-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: #4b5563;
  min-width: 0;
}

.ghg-statIcon {
  width: 14px;
  height: 14px;
  fill: currentColor;
  flex: 0 0 auto;
}

@media (prefers-reduced-motion: reduce) {

  .ghg-card,
  .ghg-image,
  .ghg-video {
    transition: none;
  }

  .ghg-cardBtn:hover .ghg-card,
  .ghg-cardBtn:focus-visible .ghg-card {
    transform: none;
  }
}

@media (max-width: 640px) {
  .ghg-scroll {
    grid-template-columns: repeat(auto-fill, minmax(165px, 1fr));
    gap: 10px;
    padding: 12px 14px 16px;
  }

  .ghg-body {
    padding: 0.7rem 0.75rem 0.8rem;
  }

  .ghg-title {
    font-size: 0.94rem;
  }

  .ghg-description {
    font-size: 0.8rem;
  }

  .ghg-stats {
    gap: 0.55rem;
  }

  .ghg-stat {
    font-size: 0.76rem;
  }
}
</style>