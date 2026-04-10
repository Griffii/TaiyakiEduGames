<template>
  <section class="ghg-root" :style="rootStyle" aria-label="Games highlight grid">
    <div class="ghg-scroll" role="list">
      <article v-for="game in games" :key="game.title" class="ghg-item" role="listitem">
        <component :is="game.type === 'internal' ? RouterLink : 'a'"
          :to="game.type === 'internal' ? game.href : undefined"
          :href="game.type === 'external' ? game.href : undefined"
          :target="game.type === 'external' ? '_blank' : undefined"
          :rel="game.type === 'external' ? 'noopener noreferrer' : undefined" class="ghg-cardBtn" :title="game.title"
          @mouseenter="playPreview(game.title)" @mouseleave="stopPreview(game.title)" @focus="playPreview(game.title)"
          @blur="stopPreview(game.title)">
          <div class="ghg-card">
            <div class="ghg-media">
              <img class="ghg-image" :src="game.image" :alt="`${game.title} preview image`" loading="lazy"
                decoding="async" draggable="false" />

              <video :ref="(el) => setVideoRef(el, game.title)" class="ghg-video" :src="game.video" muted loop
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
            </div>
          </div>
        </component>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * Assets image and video import list
 */
import typingTowerDefenceImage from '@/assets/images/screenshots/games/TTD - Main Menu 0 - v0.7.png'
import typingTowerDefenceVideo from '@/assets/videos/TTD-Previews/TTD - SeasideFarm Preview Short - v0.7.mp4'

import pizzaImage from '@/assets/images/screenshots/games/PaP_01.png'
import pizzaVideo from '@/assets/videos/PaP/PaP-preview-short.mp4'


type GameCard = {
  title: string
  description: string
  platform?: string
  type: 'internal' | 'external'
  href: string
  image: string
  video: string
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
    title: 'Typing Tower Defence!',
    description: 'Type words to protect your castle and defeat the enemies.',
    platform: 'NEW!',
    type: 'internal',
    href: '/activities/typing-tower-defence',
    image: typingTowerDefenceImage,
    video: typingTowerDefenceVideo,
  },
  {
    title: 'Pizzas & Parfaits',
    description: 'Make pizzas/parfaits and earn as much money as fast as you can.',
    platform: '',
    type: 'internal',
    href: '/activities/pizzas-and-parfaits',
    image: pizzaImage,
    video: pizzaVideo,
  },
]

const safeGap = computed(() => Math.max(8, Math.min(28, Math.floor(props.gap || 14))))
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
}
</style>