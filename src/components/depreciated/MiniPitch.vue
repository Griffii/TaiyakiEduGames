<!-- src/components/MiniPitch.vue -->
<template>
  <div class="landing" :data-dir="scrollDir">
    <!-- Banner pointers ABOVE hero -->
    <div class="banner-hints" aria-hidden="true">
      <div class="hint-block left">
        <img class="hint-arrow" :src="arrowLeftSrc" alt="Arrow pointing to top-left banner area" />
        <span class="hint-text">Profile</span>
      </div>
      <div class="hint-block right">
        <img class="hint-arrow" :src="arrowRightSrc" alt="Arrow pointing to top-right banner area" />
        <span class="hint-text">Navigation</span>
      </div>
    </div>

    <!-- Hero -->
    <header class="hero">
      <div class="hero-bg">
        <div class="grid-overlay" />
      </div>
      <div class="hero-inner">
        <h1 class="hero-title">
          <span class="fade-in-1 hero-brand">EiTake </span>
          <span class="fade-in-2"></span>
          <span class="fade-in-3"><small class="jp">Play · Review · Learn</small></span>
        </h1>
        <p class="hero-sub fade-in-4">Built for Japanese schools.</p>
      </div>
    </header>

    <!-- Sections -->
    <main id="sections" class="sections">
      <section
        v-for="s in sections"
        :key="s.id"
        :id="`sec-${s.id}`"
        class="section"
        :class="{ 'in-view': inView[s.id], focused: focusedId === s.id, expanded: expandedId === s.id }"
        :style="{ '--stagger': (s.id * 40) + 'ms' }"
        :aria-expanded="expandedId === s.id"
        role="button"
        tabindex="0"
        @click="toggleExpand(s.id)"
        @keydown.enter.prevent="toggleExpand(s.id)"
        @keydown.space.prevent="toggleExpand(s.id)"
        :ref="(el) => setSectionRef(s.id, el as HTMLElement | null)"
      >
        <!-- Decorative mushrooms -->
        <div class="shrooms" aria-hidden="true">
          <template v-for="(m, mi) in s.mushrooms" :key="`m-${mi}`">
            <img
              v-for="n in (m.count || 1)"
              :key="`m-${mi}-${n}`"
              class="shroom"
              :class="`pos-${(m.side || 'left').replace(' ', '-')}`"
              :src="m.src"
              :alt="m.alt || 'decorative mushroom'"
              :style="shroomInstanceStyle(m, n - 1)"
              loading="lazy"
              decoding="async"
              @pointerenter="startShroomBounce"
              @pointerdown="startShroomBounce"
              @animationend="onShroomAnimEnd"
            />
          </template>
        </div>

        <!-- Compact Title Card -->
        <div class="card">
          <div class="card-tilt">
            <div class="card-head">
              <div class="icon bob">{{ s.icon }}</div>
              <div class="titles">
                <h2 class="card-title">{{ s.title }}</h2>
                <p class="card-tagline">{{ s.tagline }}</p>
              </div>
            </div>
            <p class="card-teaser">{{ s.teaser }}</p>
            <div class="chip-row">
              <span class="chip" v-for="c in s.chips" :key="c">{{ c }}</span>
            </div>
          </div>
        </div>

        <!-- Expandable Details -->
        <div class="expandable" :class="{ open: expandedId === s.id }">
          <div class="expandable__inner">
            <div class="details">
              <div class="gallery">
                <figure class="shot-card" v-for="(shot, i) in s.screens" :key="i">
                  <div class="shot-img">
                    <img
                      :src="shot.src"
                      :alt="shot.alt"
                      loading="lazy"
                      decoding="async"
                      @click.stop="openLightbox(shot)"
                      @keydown.enter.prevent.stop="openLightbox(shot)"
                      @keydown.space.prevent.stop="openLightbox(shot)"
                      role="button"
                      tabindex="0"
                      title="Click to zoom"
                    />
                  </div>
                  <figcaption class="shot-title">{{ shot.title }}</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Lightbox -->
    <div
      v-if="lightboxOpen"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot preview"
      @click="closeLightbox"
    >
      <figure class="lightbox-inner" @click.stop>
        <img :src="lightboxItem?.src" :alt="lightboxItem?.alt || ''" />
        <figcaption v-if="lightboxItem">
          <h4>{{ lightboxItem.title }}</h4>
          <p>{{ lightboxItem.desc }}</p>
        </figcaption>
        <button class="lightbox-close" @click="closeLightbox" aria-label="Close">×</button>
      </figure>
    </div>

    <footer class="footer">
      <p>© {{ new Date().getFullYear() }} Griffii Games — Built with ❤️ in Japan</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue'

/* Mushrooms */
import redShroom from '@/assets/images/mushrooms/red-mushroom-sticker.png'
import blueShroom from '@/assets/images/mushrooms/blue-mushroom-sticker.png'
import greenShroom from '@/assets/images/mushrooms/green-mushroom-sticker.png'

/* Screenshots */
import ssStudents1 from '@/assets/images/screenshots/Activities_Page.png'
import ssStudents2 from '@/assets/images/screenshots/Student-profile-view.png'
import ssStudents3 from '@/assets/images/screenshots/PaP_01.png'

import ssTeachers1 from '@/assets/images/screenshots/create-a-class.png'
import ssTeachers2 from '@/assets/images/screenshots/user-edit.png'

import ssTextbooks1 from '@/assets/images/screenshots/Textbooks_Page.png'
import ssTextbooks2 from '@/assets/images/screenshots/flashcard-view.png'
import ssTextbooks3 from '@/assets/images/screenshots/RandomPoints_Page.png'

import ssGames1 from '@/assets/images/screenshots/Flashcard_Games_Popup.png'
import ssGames2 from '@/assets/images/screenshots/spelling-battle.png'
import ssGames3 from '@/assets/images/screenshots/who-is-it.png'
import ssGames4 from '@/assets/images/screenshots/PaP_02.png'

import ssXP1 from '@/assets/images/screenshots/Class-Leaderboard.png'
import ssXP2 from '@/assets/images/screenshots/Class_Page.png'

defineOptions({ name: 'MiniPitch' })

type Shroom = {
  src: string
  alt?: string
  side?: 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  size?: number
  offset?: number
  gap?: number
  count?: number
}
type ScreenItem = { src: string; alt: string; title: string; desc: string }
type Section = {
  id: number
  title: string
  tagline: string
  teaser: string
  chips: string[]
  icon: string
  mushrooms?: Shroom[]
  screens: ScreenItem[]
}

import arrowLeft from '@/assets/images/icons/arrow_left.png'
import arrowRight from '@/assets/images/icons/arrow_right.png'
const arrowLeftSrc = arrowLeft
const arrowRightSrc = arrowRight


const sections = reactive<Section[]>([
  {
    id: 1,
    title: 'For Students',
    tagline: 'The BEST way to study!',
    teaser: 'Practice the exact vocabulary and patterns you’re learning at school — with games.',
    chips: ['XP & Levels', 'Streaks', 'Highscores', 'Fun Games'],
    icon: '🎯',
    mushrooms: [
      { src: redShroom, side: 'left', size: 84, offset: -40 },
      { src: blueShroom, side: 'bottom-right', size: 70, offset: 10 }
    ],
    screens: [
      { src: ssStudents1, alt: 'Activities page', title: 'Clear Organization', desc: 'Activities are tagged and organized by textbook, content, and level.' },
      { src: ssStudents2, alt: 'Student profile XP', title: 'Student profiles', desc: 'XP bar, level, and recent achievements keep motivation high.' },
      { src: ssStudents3, alt: 'Pizzas and parfaits', title: 'High Quality Games', desc: 'Interactive, quality games designed to improve learned English skills.' }
    ]
  },
  {
    id: 2,
    title: 'For Teachers',
    tagline: 'Zero-prep classroom activities.',
    teaser: 'Project a game in seconds. Assign decks and control access per class.',
    chips: ['Class Management', 'Projector-ready', 'Full Control'],
    icon: '👩‍🏫',
    mushrooms: [{ src: greenShroom, side: 'right', size: 80, offset: 20 }],
    screens: [
      { src: ssTeachers1, alt: 'Create classes', title: 'Create classes', desc: 'Add class name, grade, and textbooks that auto-add flashcards and games.' },
      { src: ssTeachers2, alt: 'Manage students', title: 'Manage students', desc: 'See participation, grant XP, and launch activities.' },
      { src: ssTextbooks3, alt: 'Random points game', title: 'Teacher Support Tools', desc: 'Roulette, random points, and other projector-friendly tools.' }
    ]
  },
  {
    id: 3,
    title: 'Textbooks & Decks',
    tagline: 'Aligned to common Japanese textbooks',
    teaser: 'Browse New Crown, New Horizon, and more.',
    chips: ['Flashcards', 'Games', 'Reviews', 'Find your textbook!'],
    icon: '📚',
    mushrooms: [{ src: redShroom, side: 'bottom-left', size: 75, offset: 20 }],
    screens: [
      { src: ssTextbooks1, alt: 'Browse textbooks', title: 'Browse textbooks', desc: 'Pick your school’s series and jump straight to the unit.' },
      { src: ssTextbooks2, alt: 'Flashcard view', title: 'Pre-built Flashcard Decks', desc: 'Vocab pulled directly from the textbooks and organized by unit.' }
    ]
  },
  {
    id: 4,
    title: 'Classroom Games',
    tagline: 'Make review day the best day',
    teaser: 'Spin wheels, flip cards, make pizzas — students love it!',
    chips: ['High Quality', 'Cirriculumn Focused', 'Single and Multiplayer'],
    icon: '🕹️',
    mushrooms: [{ src: greenShroom, side: 'bottom', size: 64, offset: 20, count: 10, gap: 128 }],
    screens: [
      { src: ssGames1, alt: 'Flashcard Games', title: 'Flashcard Games', desc: 'Fast-paced vocab reveals with dramatic timing and SFX.' },
      { src: ssGames2, alt: 'Spelling Battle', title: 'Spelling Battle', desc: 'Competitive spelling with streaks and power-ups.' },
      { src: ssGames3, alt: 'Who is it', title: 'Who is it', desc: 'Clue-driven guessing to practice questions/answers.' },
      { src: ssGames4, alt: 'Pizzas & Parfaits', title: 'Pizzas & Parfaits', desc: 'Make pizzas and parfaits for colorful characters. Make as much money as you can before time runs out.' }
    ]
  },
  {
    id: 5,
    title: 'XP & Levels',
    tagline: 'Motivation that sticks',
    teaser: 'Play, earn XP, and level up your profile.',
    chips: ['Badges', 'Leaderboards', 'Levels'],
    icon: '🏅',
    mushrooms: [{ src: blueShroom, side: 'right', size: 110, offset: 150 }],
    screens: [
      { src: ssXP1, alt: 'Leaderboard', title: 'Leaderboards', desc: 'Opt-in class rankings that turn practice into friendly competition.' },
      { src: ssXP2, alt: 'Class page', title: 'Class overview', desc: 'At-a-glance activity and quick XP actions.' }
    ]
  }
])

/* State */
const expandedId = ref<number | null>(null)
const focusedId = ref<number | null>(null)
const inView = reactive<Record<number, boolean>>({})
const scrollDir = ref<'up' | 'down'>('down')

/* Lightbox */
const lightboxOpen = ref(false)
const lightboxItem = ref<ScreenItem | null>(null)
function openLightbox(item: ScreenItem) {
  lightboxItem.value = item
  lightboxOpen.value = true
  document.body.style.setProperty('overflow', 'hidden')
}
function closeLightbox() {
  lightboxOpen.value = false
  lightboxItem.value = null
  document.body.style.removeProperty('overflow')
}

/* Refs + IO */
const sectionMap = new Map<number, HTMLElement>()
function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
  if (expandedId.value != null) sectionMap.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
function setSectionRef(id: number, el: HTMLElement | null) {
  if (!el) { sectionMap.delete(id); return }
  sectionMap.set(id, el)
  io?.observe(el)
}

/* Mushroom placement */
function shroomInstanceStyle(m: Shroom, idx: number) {
  const size = `${m.size ?? 64}px`
  const gap = m.gap ?? 48
  const base = m.offset ?? 0
  const side = m.side || 'left'
  const along = base + idx * gap
  let tx = '0px', ty = '0px'
  if (side === 'left' || side === 'right') ty = `${along}px`
  else if (side === 'top' || side === 'bottom') tx = `${along}px`
  else { tx = `${along}px`; ty = `${Math.round(along * 0.2)}px` }
  return { width: size, height: 'auto', '--tx': tx, '--ty': ty } as Record<string, string>
}

/* One-shot mushroom bounce */
function startShroomBounce(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  if (!el.classList.contains('animating')) el.classList.add('animating')
}
function onShroomAnimEnd(e: AnimationEvent) {
  const el = e.currentTarget as HTMLElement | null
  if (!el) return
  el.classList.remove('animating')
}

/* IO + scroll dir + ESC */
let io: IntersectionObserver | null = null
let raf = 0
let lastY = window.scrollY
function onScroll() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const y = window.scrollY
    scrollDir.value = y < lastY ? 'up' : 'down'
    lastY = y
  })
}
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && lightboxOpen.value) closeLightbox()
}

onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      let best: { id: number; ratio: number } | null = null
      for (const e of entries) {
        const id = Number((e.target as HTMLElement).id.replace('sec-', ''))
        inView[id] = e.isIntersecting && e.intersectionRatio > 0.06
        if (!best || e.intersectionRatio > best.ratio) best = { id, ratio: e.intersectionRatio }
      }
      if (best && best.ratio >= 0.6) focusedId.value = best.id
    },
    { threshold: [0, 0.06, 0.2, 0.4, 0.6, 0.9, 1], rootMargin: '-8% 0% -8% 0%' }
  )
  sectionMap.forEach((el) => io?.observe(el))
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  io?.disconnect(); io = null
  cancelAnimationFrame(raf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped>
/* Let the page's own background show through */
.landing { color: var(--text, #eef4ff); background: transparent; }

/* ===== Banner hints ABOVE hero (full-bleed to screen edges) ===== */
.banner-hints {
  /* make the hints span the full viewport width, centered */
  width: 90vw;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  margin: 0px 0 0;   /* remove auto-centering so full-bleed works */
  pointer-events: none;
  z-index: 5;
}

.banner-hints .hint-block {
  position: absolute;
  top: 0;
  display: flex;
  gap: 5px;
  align-items: flex-start;
  filter: drop-shadow(0 1px 0 rgba(0,0,0,.25));
}

/* Force left to use LEFT only */
.banner-hints .hint-block.left {
  left: clamp(8px, 2vw, 32px);
  right: auto !important;
}

/* Force right to use RIGHT only */
.banner-hints .hint-block.right {
  right: clamp(8px, 2vw, 32px);
  left: auto !important;
  flex-direction: row-reverse;
}

/* Optional: responsive arrow + label sizing */
.banner-hints .hint-arrow {
  width: clamp(72px, 6vw, 110px);
  height: clamp(72px, 6vw, 110px);
  object-fit: contain;
  opacity: .9;
  pointer-events: none;
  transform: translateY(-10px);
}
.banner-hints .hint-text {
  padding-top: clamp(36px, 3vw, 60px);
  font-size: clamp(18px, 2.2vw, 30px);
  font-weight: 700;
  color: #dadfee;
  user-select: none;
  font-family: var(--font-script);
}



/* ====== Hero ====== */
.hero {
  position: relative;
  min-height: clamp(360px, 65svh, 760px);
  display: grid;
  place-items: center;
  overflow: clip;
  isolation: isolate;
  line-height: 0.05; 
  
}

.hero-brand {
  font-size: clamp(38px, 8vw, 96px); 
  line-height: 0.95; 
  letter-spacing: -0.02em; 
  font-weight: 800; 
  display: grid; 
  gap: 0.1em; 
  font-family: var(--font-strict);
}


.hero-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px) 0 0 / 48px 48px,
    linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px) 0 0 / 48px 48px;
  mask-image: radial-gradient(70% 60% at 50% 50%, #000 60%, transparent 100%);
}

.hero-inner {
  position: relative;
  text-align: center;
  padding: 2rem;
  max-width: 1000px;
}

.hero-title {
  font-size: clamp(38px, 8vw, 96px);
  line-height: 0.15;
  letter-spacing: -0.02em;
  font-weight: 900;
  display: grid;
  gap: 0.1em;
  font-family: var(--font-script);
}

.hero-title span {
  display: inline-block;
  background: linear-gradient(90deg, #fff, #eaf2ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-title .jp {
  font-size: 0.45em;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #cfe2ff;
  background: none;
  -webkit-text-fill-color: currentColor;
}

.hero-sub {
  margin-top: 1rem;
  font-size: clamp(16px, 2.6vw, 20px);
  color: #cdd6ee;
}

/* Intro fade-ins */
.fade-in-1 { animation: popIn 0.6s both 0.0s; } .fade-in-2 { animation: popIn 0.6s both 0.08s; } .fade-in-3 { animation: fadeUp 0.6s both 0.16s; }
@keyframes popIn { from { opacity: 0; transform: translateY(16px) scale(0.98); filter: blur(4px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

/* ===== Sections ===== */
.sections { 
  width: min(1280px, 90%); 
  margin: 4.5rem auto 6rem; 
  display: grid; 
  gap: 26px; 
  position: relative; }

/* Sticker cards with direction-aware in/out */
.section {
  --easing: cubic-bezier(.2,.8,.2,1);
  position: relative;
  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.88));
  border: 3px solid #0b162e; border-radius: 22px; padding: 18px; cursor: pointer; outline: none;
  transform: translateY(var(--offY, 26px)) scale(.985); opacity: 0;
  transition:
    transform 520ms var(--easing) var(--stagger, 0ms),
    opacity 520ms var(--easing) var(--stagger, 0ms),
    box-shadow 380ms ease, filter 380ms ease;
  box-shadow: 0 2px 0 #0b162e, 0 10px 22px rgba(10, 17, 35, 0.25), 0 0 0 8px rgba(255,255,255,0.7);
  will-change: transform, opacity, filter;
}
.landing[data-dir="down"] .section { --offY: 26px; }
.landing[data-dir="up"]   .section { --offY: -26px; }
.section.in-view { opacity: 1; transform: translateY(0) scale(1); }
.section.focused { box-shadow: 0 4px 0 #0b162e, 0 20px 34px rgba(10, 17, 35, 0.35), 0 0 0 10px rgba(255,255,255,0.85); filter: saturate(108%); }
.section:focus-visible { box-shadow: 0 0 0 3px #6aa2ff, 0 0 0 10px rgba(255,255,255,0.85); }

/* Card head */
.card { perspective: none; } .card-tilt { transform: none; }
.card-head { display: grid; grid-template-columns: 58px 1fr; gap: 14px; align-items: center; }
.icon { inline-size: 58px; block-size: 58px; display: grid; place-items: center; background: #fff6f0; border: 3px solid #0b162e; border-radius: 16px; font-size: 30px; box-shadow: 0 2px 0 #0b162e, 0 8px 16px rgba(11,22,46,0.12); }
.card-title { font-size: clamp(20px, 3.2vw, 28px); font-weight: 900; letter-spacing: -0.01em; color: #0b162e; }
.card-tagline { color: #3d4b6a; margin-top: 2px; }
.card-teaser { margin: 12px 0 10px; color: #1f2740; }

/* Chips */
.chip-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.chip {
  position: relative; font-size: 12px; padding: 6px 10px; border-radius: 999px; font-weight: 800;
  border: 2px solid #0b162e; color: #0b162e; box-shadow: 0 2px 0 #0b162e; background: #ffe9f0;
  background-image: linear-gradient(90deg, #ffd86b, #9fe4ff 60%, #ffc6ec); background-size: 0% 100%, auto; background-repeat: no-repeat;
  transition: background-size 320ms ease, transform 120ms ease, filter 120ms ease;
}
.chip:hover { background-size: 100% 100%, auto; transform: translateY(-1px); filter: saturate(108%); }

/* Expandable */
.expandable { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 420ms cubic-bezier(.2,.8,.2,1); }
.expandable.open { grid-template-rows: 1fr; }
.expandable__inner { min-height: 0; overflow: clip; background: linear-gradient(180deg, #f9fbff, #f3f7ff); border: 3px solid #0b162e; border-radius: 16px; box-shadow: inset 0 2px 0 #0b162e, inset 0 10px 22px rgba(11,22,46,0.05); }

/* Details */
.details { padding: 18px 14px 20px; }

/* Gallery */
.gallery {
  --shot-max-h: clamp(180px, 26vh, 260px);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: clamp(16px, 2vw, 22px);
}
.shot-card { margin: 0; }
.shot-img {
  background: #fff;
  border: 3px solid #0b162e; border-radius: 14px;
  box-shadow: 0 2px 0 #0b162e, 0 12px 20px rgba(11,22,46,0.08);
  overflow: hidden;
}
.shot-img img {
  width: 100%; height: auto; display: block; max-height: var(--shot-max-h); object-fit: contain;
  cursor: zoom-in; transition: transform 140ms ease, filter 140ms ease, box-shadow 140ms ease;
  background: #fff;
}
.shot-img img:hover { transform: translateY(-2px); filter: saturate(106%); }
.shot-title { text-align: center; font-weight: 900; color: #0b162e; margin-top: 8px; letter-spacing: .01em; }

/* Expanded depth */
.section.expanded { transform: translateY(-2px) scale(1.01); z-index: 10; }

/* === Lightbox === */
.lightbox {
  position: fixed; inset: 0; background: rgba(5, 10, 25, 0.66);
  display: grid; place-items: center; padding: 4vw; z-index: 1000;
  animation: lbFade 160ms ease-out both;
}
@keyframes lbFade { from { opacity: 0; } to { opacity: 1; } }
.lightbox-inner {
  position: relative; max-width: min(1200px, 92vw); max-height: 86vh;
  background: #fff; border: 3px solid #0b162e; border-radius: 18px; padding: clamp(8px, 1.4vw, 16px);
  box-shadow: 0 6px 0 #0b162e, 0 30px 60px rgba(0,0,0,0.35);
  animation: lbPop 180ms cubic-bezier(.2,.8,.2,1) both;
}
@keyframes lbPop { from { transform: scale(.98); filter: blur(2px); } to { transform: scale(1); filter: blur(0); } }
.lightbox-inner img { display: block; width: 100%; height: auto; max-height: 70vh; object-fit: contain; border-radius: 12px; background: #fff; }
.lightbox-inner figcaption { margin-top: 10px; }
.lightbox-inner h4 { margin: 0 0 4px; color: #0b162e; }
.lightbox-inner p  { margin: 0; color: #2a3556; }
.lightbox-close {
  position: absolute; top: 6px; right: 10px;
  inline-size: 40px; block-size: 40px; border-radius: 50%;
  font-size: 28px; line-height: 36px; text-align: center;
  background: #ffd86b; color: #1d1500; border: 2px solid rgba(0,0,0,0.22);
  box-shadow: 0 3px 0 #c2a34b; cursor: pointer;
}

/* === Decorative mushrooms === */
.shrooms { position: absolute; inset: 0; pointer-events: none; }
.shroom {
  position: absolute; width: 64px; height: auto; image-rendering: auto;
  --tx: 0px; --ty: 0px; transform: translate(var(--tx), var(--ty));
  filter: drop-shadow(0 4px 0 #0b162e) drop-shadow(0 16px 20px rgba(11,22,46,0.2));
  pointer-events: auto;
}
.shroom.animating { animation: shroom-bounce 520ms cubic-bezier(.2,.8,.2,1); }
@keyframes shroom-bounce {
  0%   { transform: translate(var(--tx), var(--ty)) scale(1); }
  35%  { transform: translate(var(--tx), calc(var(--ty) - 10px)) scale(1.03); }
  60%  { transform: translate(var(--tx), var(--ty)) scale(1); }
  80%  { transform: translate(var(--tx), calc(var(--ty) - 5px))  scale(1.01); }
  100% { transform: translate(var(--tx), var(--ty)) scale(1); }
}

/* side anchors */
.pos-left { left: -28px; top: 12px; }
.pos-right { right: -28px; top: 12px; }
.pos-top { top: -28px; left: 12px; }
.pos-bottom { bottom: -28px; left: 12px; }
.pos-top-left { left: -22px; top: -22px; }
.pos-top-right { right: -22px; top: -22px; }
.pos-bottom-left { left: -22px; bottom: -22px; }
.pos-bottom-right { right: -22px; bottom: -22px; }

/* Footer */
.footer { text-align: center; color: #cfd8ef; padding: 64px 12px 80px; }

/* Motion accessibility */
@media (prefers-reduced-motion: reduce) {
  .cta, .section, .fade-in-1, .fade-in-2, .fade-in-3, .shroom, .lightbox, .lightbox-inner { animation: none !important; transition: none !important; }
}
</style>
